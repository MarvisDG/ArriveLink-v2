import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "../../infrastructure/db/client";
import * as repo from "../../infrastructure/db/repositories/booking-repository";
import {
  assertTransition,
  holdsSeats,
  type BookingStatus,
} from "../../domain/booking/booking-status";
import {
  generateBookingReference,
  generateTicketCode,
} from "../../domain/shared/identifiers";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  SeatsUnavailableError,
  ValidationError,
} from "../../domain/shared/errors";
import {
  calculateFees,
  type PaymentMethod,
} from "../../domain/payment/fees";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

/**
 * Booking use cases — the PRD §5 state machine, executed against Postgres.
 *
 * Every transition runs inside a transaction that locks the booking row first,
 * so two reps clicking accept on the same request serialise rather than both
 * succeeding. The transition itself is always delegated to `assertTransition`;
 * this file never decides for itself whether a move is legal.
 */

const CONVENIENCE_FEE = env.CONVENIENCE_FEE_KOBO;

/** PRD caps a single reservation at 6 seats. */
export const createBookingSchema = z.object({
  route_id: z.coerce.number().int().positive(),
  traveler_name: z.string().trim().min(2, "Enter the traveler's name").max(120),
  traveler_phone: z
    .string()
    .trim()
    .regex(
      /^(\+?234|0)[789]\d{9}$/,
      "Enter a valid Nigerian phone number, e.g. 08012345678",
    ),
  traveler_email: z.string().trim().email().optional(),
  seats_requested: z.coerce
    .number()
    .int()
    .min(1, "At least one seat is required")
    .max(6, "A single reservation is limited to 6 seats"),
  departure_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use HH:MM, e.g. 06:30"),
  /**
   * Optional, and the reason it exists: the timetable label alone does not
   * identify a departure. Without a date, a request for "06:30" that cannot fit
   * on today's coach resolves to the next date that has room — which would put a
   * traveler on tomorrow's bus without them asking. Callers that know the date
   * should pin it; the response always reports the `departure_date` actually
   * booked either way.
   */
  departure_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
});

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

async function requireBooking(id: number) {
  const booking = await repo.findBookingById(id, CONVENIENCE_FEE);
  if (!booking) throw new NotFoundError("Booking", id);
  return booking;
}

/**
 * Hold seats and open a reservation request.
 *
 * The seat hold and the booking insert are one transaction: a hold with no
 * booking would leak inventory that nothing will ever release.
 */
export async function createBooking(
  input: z.infer<typeof createBookingSchema>,
  travelerId?: number,
) {
  const departure = await repo.findNextDeparture(
    input.route_id,
    input.departure_time,
    input.seats_requested,
    input.departure_date,
  );

  // No such departure is a 404. A departure that exists but is full is a 409
  // carrying the seats actually left, so the UI can say "only 2 seats remain"
  // instead of claiming the bus does not exist.
  if (!departure) {
    throw new NotFoundError(
      "Departure",
      input.departure_date
        ? `${input.departure_date} ${input.departure_time}`
        : input.departure_time,
    );
  }
  if (departure.seatsAvailable < input.seats_requested) {
    throw new SeatsUnavailableError(
      input.seats_requested,
      departure.seatsAvailable,
    );
  }
  if (!departure.routeActive) {
    throw new ConflictError(
      "ROUTE_INACTIVE",
      "This route is no longer accepting bookings.",
    );
  }

  const farePerSeat = departure.fareOverride ?? departure.routeFare;

  const bookingId = await db.transaction(async (tx) => {
    const exec = tx as unknown as typeof db;

    // Re-read under a row lock. The availability check above was optimistic and
    // may be stale by the time we get here; this one decides.
    const locked = await repo.lockDeparture(departure.id, exec);
    if (!locked) throw new NotFoundError("Departure", departure.id);

    if (locked.seats_available < input.seats_requested) {
      throw new SeatsUnavailableError(
        input.seats_requested,
        locked.seats_available,
      );
    }

    await repo.adjustSeats(departure.id, -input.seats_requested, exec);

    const created = await repo.insertBooking(
      {
        reference: generateBookingReference(),
        departureId: departure.id,
        travelerId: travelerId ?? null,
        travelerName: input.traveler_name,
        travelerPhone: input.traveler_phone,
        travelerEmail: input.traveler_email ?? null,
        seatsRequested: input.seats_requested,
        farePerSeat,
        responseDeadline: minutesFromNow(env.RESPONSE_WINDOW_MINUTES),
      },
      exec,
    );

    return created.id;
  });

  return requireBooking(bookingId);
}

export async function getBooking(id: number) {
  return requireBooking(id);
}

export async function listBookingsByPhone(phone: string) {
  return repo.findBookingsByPhone(phone, CONVENIENCE_FEE);
}

export async function listBookingsForTraveler(travelerId: number) {
  return repo.findBookingsByTraveler(travelerId, CONVENIENCE_FEE);
}

export async function listOperatorRequests(operatorId: number) {
  return repo.findOperatorRequests(operatorId, CONVENIENCE_FEE);
}

export async function listOperatorActive(operatorId: number) {
  return repo.findOperatorActiveBookings(operatorId, CONVENIENCE_FEE);
}

export async function searchForBoarding(query: string, operatorId: number) {
  const booking = await repo.searchOperatorBooking(
    query,
    operatorId,
    CONVENIENCE_FEE,
  );
  if (!booking) throw new NotFoundError("No booking matches that reference");
  return booking;
}

/**
 * Shared guard for every operator-driven transition: lock the row, confirm the
 * caller owns it, and confirm the move is legal before anything is written.
 */
async function transitionAsOperator(
  bookingId: number,
  operatorId: number,
  to: BookingStatus,
  apply: (
    locked: NonNullable<Awaited<ReturnType<typeof repo.lockBooking>>>,
    exec: typeof db,
  ) => Promise<void>,
) {
  await db.transaction(async (tx) => {
    const exec = tx as unknown as typeof db;

    const locked = await repo.lockBooking(bookingId, exec);
    if (!locked) throw new NotFoundError("Booking", bookingId);

    // Same 404 as "does not exist": a 403 would confirm the id is real and
    // belongs to a competitor.
    if (locked.operator_id !== operatorId) {
      throw new NotFoundError("Booking", bookingId);
    }

    assertTransition(locked.status, to);
    await apply(locked, exec);
  });

  return requireBooking(bookingId);
}

/**
 * Rep accepts. The PRD raises the payment request immediately on acceptance, so
 * this walks CONFIRMED then AWAITING_PAYMENT in one transaction — both are
 * asserted, so the audit trail and the state machine stay honest even though the
 * traveler only ever observes the second.
 */
export async function acceptBooking(
  bookingId: number,
  operatorId: number,
  repUserId: number,
) {
  return transitionAsOperator(
    bookingId,
    operatorId,
    "CONFIRMED",
    async (locked, exec) => {
      const now = new Date();
      await repo.updateBookingStatus(
        locked.id,
        "CONFIRMED",
        { confirmedAt: now, actionedByRepId: repUserId },
        exec,
      );

      assertTransition("CONFIRMED", "AWAITING_PAYMENT");
      await repo.updateBookingStatus(
        locked.id,
        "AWAITING_PAYMENT",
        { paymentDeadline: minutesFromNow(env.PAYMENT_WINDOW_MINUTES) },
        exec,
      );
    },
  );
}

/** Rep declines. The held seats go back to the departure in the same commit. */
export async function rejectBooking(
  bookingId: number,
  operatorId: number,
  repUserId: number,
  reason?: string,
) {
  return transitionAsOperator(
    bookingId,
    operatorId,
    "REJECTED",
    async (locked, exec) => {
      await repo.updateBookingStatus(
        locked.id,
        "REJECTED",
        {
          cancelledAt: new Date(),
          rejectionReason: reason ?? null,
          actionedByRepId: repUserId,
        },
        exec,
      );
      if (holdsSeats(locked.status)) {
        await repo.adjustSeats(locked.departure_id, locked.seats_requested, exec);
      }
    },
  );
}

export async function boardBooking(bookingId: number, operatorId: number) {
  return transitionAsOperator(
    bookingId,
    operatorId,
    "BOARDED",
    async (locked, exec) => {
      await repo.updateBookingStatus(
        locked.id,
        "BOARDED",
        { boardedAt: new Date() },
        exec,
      );
    },
  );
}

/**
 * PRD §3 screen 5 / §8 — the checkout quote.
 *
 * Pure read. Quoting must not advance the state machine, so a traveler toggling
 * between card and transfer to compare the processing fee cannot accidentally
 * consume their own payment window.
 */
export async function getCheckoutQuote(
  bookingId: number,
  method: PaymentMethod = "card",
) {
  const booking = await requireBooking(bookingId);

  const fees = calculateFees({
    farePerSeat: booking.fare_per_seat,
    seats: booking.seats_requested,
    method,
    convenienceFee: CONVENIENCE_FEE,
  });

  return {
    booking_id: booking.id,
    reference: booking.reference,
    status: booking.status,
    /**
     * PRD §8 step 14: payment is requested only after CONFIRMED is reached.
     * The quote is still readable beforehand so the request screen can preview
     * the cost, but the client must not offer to pay until this is true.
     */
    payable: booking.status === "AWAITING_PAYMENT",
    payment_deadline: booking.payment_deadline,
    seats: booking.seats_requested,
    fare_per_seat: booking.fare_per_seat,
    payment_method: method,
    fare_subtotal: fees.fareSubtotal,
    convenience_fee: fees.convenienceFee,
    processing_fee: fees.processingFee,
    total: fees.total,
  };
}

/**
 * Mark a booking paid and issue its ticket.
 *
 * PRD §9 requires payment status to be driven by Paystack webhooks, not by the
 * client. Until Paystack is wired this is the development stand-in for that
 * webhook: it performs exactly what the webhook handler will, so the state
 * machine, ticket issuance and wallet credit are already exercised. It refuses
 * to run in production for that reason.
 */
export async function markBookingPaid(
  bookingId: number,
  method: PaymentMethod = "card",
) {
  if (env.NODE_ENV === "production") {
    throw new ForbiddenError(
      "Payments are confirmed by the Paystack webhook, not by this endpoint.",
    );
  }

  await db.transaction(async (tx) => {
    const exec = tx as unknown as typeof db;

    const locked = await repo.lockBooking(bookingId, exec);
    if (!locked) throw new NotFoundError("Booking", bookingId);

    assertTransition(locked.status, "PAID");
    const now = new Date();
    await repo.updateBookingStatus(locked.id, "PAID", { paidAt: now }, exec);

    // PAID → TICKET_ISSUED is automatic and in the same transaction: a paid
    // booking with no ticket is a traveler who cannot board.
    assertTransition("PAID", "TICKET_ISSUED");
    await repo.insertTicket(
      {
        bookingId: locked.id,
        ticketCode: generateTicketCode(),
        // Opaque and unguessable — the QR is what the gate scans, so a
        // predictable token would be a free ride.
        qrToken: randomBytes(24).toString("base64url"),
      },
      exec,
    );
    await repo.updateBookingStatus(locked.id, "TICKET_ISSUED", {}, exec);

    /**
     * Record the money (PRD §6 payments, PRD §8 line items).
     *
     * Written inside the same transaction as the status change: a booking that
     * says PAID with no payment row behind it is a trip nobody can reconcile,
     * and a settlement dispute with no evidence.
     */
    const fees = calculateFees({
      farePerSeat: locked.fare_per_seat,
      seats: locked.seats_requested,
      method,
      convenienceFee: env.CONVENIENCE_FEE_KOBO,
    });

    await repo.upsertPayment(
      {
        bookingId: locked.id,
        fareAmount: fees.fareSubtotal,
        convenienceFee: fees.convenienceFee,
        processingFee: fees.processingFee,
        paymentMethod: method,
        status: "success",
        paidAt: now,
      },
      exec,
    );

    // The operator is owed the fare only. The convenience fee is ArriveLink's
    // and the processing fee is Paystack's — crediting the gross here is how an
    // operator ends up being paid our revenue as well as their own.
    await repo.creditPendingBalance(
      locked.operator_id,
      locked.id,
      fees.fareSubtotal,
      `Booking #${locked.id} paid`,
      exec,
    );
  });

  return requireBooking(bookingId);
}

export async function getOperatorWallet(operatorId: number) {
  const wallet = await repo.findWallet(operatorId);
  if (!wallet) throw new NotFoundError("Wallet for operator", operatorId);
  return wallet;
}

/**
 * Expire bookings whose response or payment window has closed and return their
 * seats.
 *
 * Runs on an interval rather than lazily on read: the mock implementation swept
 * inside every query, which meant a departure's seats stayed locked up for as
 * long as nobody happened to look at it.
 */
export async function sweepExpiredBookings(): Promise<number> {
  const expired = await repo.findExpiredBookings();
  if (expired.length === 0) return 0;

  let swept = 0;

  for (const booking of expired) {
    try {
      await db.transaction(async (tx) => {
        const exec = tx as unknown as typeof db;

        // Re-check under lock: a rep may have accepted in the meantime.
        const locked = await repo.lockBooking(booking.id, exec);
        if (!locked) return;
        if (
          locked.status !== "AWAITING_RESPONSE" &&
          locked.status !== "AWAITING_PAYMENT"
        ) {
          return;
        }

        assertTransition(locked.status, "CANCELLED_TIMEOUT");
        await repo.updateBookingStatus(
          locked.id,
          "CANCELLED_TIMEOUT",
          { cancelledAt: new Date() },
          exec,
        );
        if (holdsSeats(locked.status)) {
          await repo.adjustSeats(
            locked.departure_id,
            locked.seats_requested,
            exec,
          );
        }
        swept += 1;
      });
    } catch (err) {
      // One poisoned booking must not stop the sweep for the rest.
      logger.error({ err, bookingId: booking.id }, "Sweep failed for booking");
    }
  }

  if (swept > 0) logger.info({ swept }, "Expired bookings swept");
  return swept;
}

export function assertSeatsWithinRequest(seats: number): void {
  if (seats < 1 || seats > 6) {
    throw new ValidationError("A single reservation is limited to 6 seats");
  }
}
