import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DbExecutor } from "../client";
import { bookings } from "../schema/bookings";
import { cities } from "../schema/cities";
import { operators } from "../schema/operators";
import { routes, routeDepartures } from "../schema/routes";
import { tickets } from "../schema/tickets";
import { wallets, walletTransactions } from "../schema/wallets";
import type { BookingStatus } from "../../../domain/booking/booking-status";

/**
 * Booking data access.
 *
 * Every read returns the enriched snake_case shape the booking screens consume
 * (route + company + ticket + fee breakdown), because assembling that in four
 * different callers is how the four screens end up disagreeing about what a
 * booking looks like.
 */

const origin = alias(cities, "origin");
const destination = alias(cities, "destination");

/** The columns behind the enriched booking shape, joined once. */
function bookingSelection() {
  return {
    id: bookings.id,
    reference: bookings.reference,
    departure_id: bookings.departureId,
    traveler_id: bookings.travelerId,
    traveler_name: bookings.travelerName,
    traveler_phone: bookings.travelerPhone,
    traveler_email: bookings.travelerEmail,
    seats_requested: bookings.seatsRequested,
    fare_per_seat: bookings.farePerSeat,
    status: bookings.status,
    requested_at: bookings.requestedAt,
    response_deadline: bookings.responseDeadline,
    payment_deadline: bookings.paymentDeadline,
    confirmed_at: bookings.confirmedAt,
    paid_at: bookings.paidAt,
    boarded_at: bookings.boardedAt,
    completed_at: bookings.completedAt,
    cancelled_at: bookings.cancelledAt,
    rejection_reason: bookings.rejectionReason,

    departure_date: routeDepartures.departureDate,
    departure_time_raw: routeDepartures.departureTime,

    route_id: routes.id,
    route_price: routes.fare,
    route_terminal_location: routes.terminalLocation,
    route_terminal_address: routes.terminalAddress,
    route_duration_minutes: routes.durationMinutes,

    origin_id: origin.id,
    origin_name: origin.name,
    origin_state: origin.state,
    destination_id: destination.id,
    destination_name: destination.name,
    destination_state: destination.state,

    company_id: operators.id,
    company_name: operators.businessName,
    company_logo_url: operators.logoUrl,
    company_is_verified: operators.isVerified,

    ticket_id: tickets.id,
    ticket_code: tickets.ticketCode,
    ticket_qr_token: tickets.qrToken,
    ticket_issued_at: tickets.issuedAt,
    ticket_redeemed_at: tickets.redeemedAt,
  };
}

function baseQuery(exec: DbExecutor) {
  return exec
    .select(bookingSelection())
    .from(bookings)
    .innerJoin(routeDepartures, eq(bookings.departureId, routeDepartures.id))
    .innerJoin(routes, eq(routeDepartures.routeId, routes.id))
    .innerJoin(operators, eq(routes.operatorId, operators.id))
    .innerJoin(origin, eq(routes.originCityId, origin.id))
    .innerJoin(destination, eq(routes.destinationCityId, destination.id))
    .leftJoin(tickets, eq(tickets.bookingId, bookings.id));
}

type BookingRow = Awaited<ReturnType<typeof baseQuery>>[number];

/** HH:MM — the timetable label, not the stored time-with-seconds. */
function toTimeLabel(time: string): string {
  return time.slice(0, 5);
}

function shapeBooking(row: BookingRow, convenienceFee: number) {
  const fareSubtotal = row.fare_per_seat * row.seats_requested;
  return {
    id: row.id,
    reference: row.reference,
    route_id: row.route_id,
    traveler_id: row.traveler_id,
    traveler_name: row.traveler_name,
    traveler_phone: row.traveler_phone,
    traveler_email: row.traveler_email,
    seats_requested: row.seats_requested,
    departure_time: toTimeLabel(row.departure_time_raw),
    departure_date: row.departure_date,
    status: row.status,
    requested_at: row.requested_at.toISOString(),
    response_deadline: row.response_deadline.toISOString(),
    payment_deadline: row.payment_deadline?.toISOString() ?? null,
    confirmed_at: row.confirmed_at?.toISOString() ?? null,
    paid_at: row.paid_at?.toISOString() ?? null,
    boarded_at: row.boarded_at?.toISOString() ?? null,
    completed_at: row.completed_at?.toISOString() ?? null,
    cancelled_at: row.cancelled_at?.toISOString() ?? null,
    rejection_reason: row.rejection_reason,
    route: {
      id: row.route_id,
      price: row.route_price,
      terminal_location: row.route_terminal_location,
      terminal_address: row.route_terminal_address,
      duration_minutes: row.route_duration_minutes,
      departure_city: {
        id: row.origin_id,
        name: row.origin_name,
        state: row.origin_state,
      },
      destination_city: {
        id: row.destination_id,
        name: row.destination_name,
        state: row.destination_state,
      },
    },
    company: {
      id: row.company_id,
      name: row.company_name,
      logo_url: row.company_logo_url,
      is_verified: row.company_is_verified,
    },
    ticket: row.ticket_id
      ? {
          id: row.ticket_id,
          booking_id: row.id,
          ticket_code: row.ticket_code,
          qr_token: row.ticket_qr_token,
          issued_at: row.ticket_issued_at?.toISOString() ?? null,
          redeemed_at: row.ticket_redeemed_at?.toISOString() ?? null,
        }
      : null,
    fare_per_seat: row.fare_per_seat,
    fare_subtotal: fareSubtotal,
    convenience_fee: convenienceFee,
    total_fare: fareSubtotal + convenienceFee,
  };
}

export type EnrichedBooking = ReturnType<typeof shapeBooking>;

export async function findBookingById(
  id: number,
  convenienceFee: number,
  exec: DbExecutor = db,
): Promise<EnrichedBooking | undefined> {
  const [row] = await baseQuery(exec).where(eq(bookings.id, id)).limit(1);
  return row ? shapeBooking(row, convenienceFee) : undefined;
}

export async function findBookingsByPhone(
  phone: string,
  convenienceFee: number,
  exec: DbExecutor = db,
): Promise<EnrichedBooking[]> {
  const rows = await baseQuery(exec)
    .where(eq(bookings.travelerPhone, phone))
    .orderBy(desc(bookings.requestedAt));
  return rows.map((r) => shapeBooking(r, convenienceFee));
}

export async function findBookingsByTraveler(
  travelerId: number,
  convenienceFee: number,
  exec: DbExecutor = db,
): Promise<EnrichedBooking[]> {
  const rows = await baseQuery(exec)
    .where(eq(bookings.travelerId, travelerId))
    .orderBy(desc(bookings.requestedAt));
  return rows.map((r) => shapeBooking(r, convenienceFee));
}

/** Pending requests for a rep, soonest deadline first — that is the work queue. */
export async function findOperatorRequests(
  operatorId: number,
  convenienceFee: number,
  exec: DbExecutor = db,
): Promise<EnrichedBooking[]> {
  const rows = await baseQuery(exec)
    .where(
      and(
        eq(routes.operatorId, operatorId),
        eq(bookings.status, "AWAITING_RESPONSE"),
      ),
    )
    .orderBy(asc(bookings.responseDeadline));
  return rows.map((r) => shapeBooking(r, convenienceFee));
}

export async function findOperatorActiveBookings(
  operatorId: number,
  convenienceFee: number,
  exec: DbExecutor = db,
): Promise<EnrichedBooking[]> {
  const rows = await baseQuery(exec)
    .where(
      and(
        eq(routes.operatorId, operatorId),
        inArray(bookings.status, [
          "CONFIRMED",
          "AWAITING_PAYMENT",
          "PAID",
          "TICKET_ISSUED",
          "BOARDED",
        ]),
      ),
    )
    .orderBy(asc(routeDepartures.departureDate), asc(routeDepartures.departureTime));
  return rows.map((r) => shapeBooking(r, convenienceFee));
}

/**
 * Boarding lookup: a rep types a booking reference, a ticket code or the
 * traveler's phone number, whichever the traveler can produce at the gate.
 */
export async function searchOperatorBooking(
  query: string,
  operatorId: number,
  convenienceFee: number,
  exec: DbExecutor = db,
): Promise<EnrichedBooking | undefined> {
  const term = query.trim();
  const [row] = await baseQuery(exec)
    .where(
      and(
        eq(routes.operatorId, operatorId),
        or(
          sql`upper(${bookings.reference}) = upper(${term})`,
          sql`upper(${tickets.ticketCode}) = upper(${term})`,
          eq(bookings.travelerPhone, term),
        ),
      ),
    )
    .orderBy(desc(bookings.requestedAt))
    .limit(1);
  return row ? shapeBooking(row, convenienceFee) : undefined;
}

/**
 * Resolve a (route, HH:MM) pair to the next departure that can still take
 * `seats`. The public contract speaks in timetable labels; inventory lives per
 * dated departure, and this is the only place the two meet.
 */
export async function findNextDeparture(
  routeId: number,
  timeLabel: string,
  seats: number,
  onDate?: string,
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .select({
      id: routeDepartures.id,
      departureDate: routeDepartures.departureDate,
      departureTime: routeDepartures.departureTime,
      seatsAvailable: routeDepartures.seatsAvailable,
      fareOverride: routeDepartures.fareOverride,
      routeFare: routes.fare,
      operatorId: routes.operatorId,
      routeActive: routes.isActive,
    })
    .from(routeDepartures)
    .innerJoin(routes, eq(routeDepartures.routeId, routes.id))
    .where(
      and(
        eq(routeDepartures.routeId, routeId),
        sql`to_char(${routeDepartures.departureTime}, 'HH24:MI') = ${timeLabel.slice(0, 5)}`,
        // A pinned date matches exactly; without one, the earliest future date
        // with room wins (and the response reports which was chosen).
        onDate
          ? eq(routeDepartures.departureDate, onDate)
          : sql`${routeDepartures.departureDate} >= current_date`,
        eq(routeDepartures.status, "available"),
        sql`${routeDepartures.seatsAvailable} >= ${seats}`,
      ),
    )
    .orderBy(asc(routeDepartures.departureDate))
    .limit(1);
  return row;
}

/**
 * Lock a departure row and return its current seat count.
 *
 * `FOR UPDATE` is the PRD §9 guarantee: two concurrent requests for the last
 * seat serialise here, so the second reads the decremented count and fails,
 * rather than both reading 1 and both succeeding.
 */
export async function lockDeparture(
  departureId: number,
  exec: DbExecutor,
): Promise<{ id: number; seats_available: number } | undefined> {
  const result = await exec.execute(
    sql`select id, seats_available from ${routeDepartures}
        where id = ${departureId} for update`,
  );
  const row = (result as unknown as { rows: { id: number; seats_available: number }[] })
    .rows?.[0];
  return row;
}

export async function adjustSeats(
  departureId: number,
  delta: number,
  exec: DbExecutor,
): Promise<void> {
  await exec
    .update(routeDepartures)
    .set({
      seatsAvailable: sql`${routeDepartures.seatsAvailable} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(routeDepartures.id, departureId));
}

export async function insertBooking(
  values: {
    reference: string;
    departureId: number;
    travelerId?: number | null;
    travelerName: string;
    travelerPhone: string;
    travelerEmail?: string | null;
    seatsRequested: number;
    farePerSeat: number;
    responseDeadline: Date;
  },
  exec: DbExecutor,
) {
  const [row] = await exec.insert(bookings).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

/**
 * Lock a booking and return the fields the state machine needs.
 * Locking before transitioning stops two reps accepting the same request.
 */
export async function lockBooking(
  id: number,
  exec: DbExecutor,
): Promise<
  | {
      id: number;
      status: BookingStatus;
      departure_id: number;
      seats_requested: number;
      fare_per_seat: number;
      operator_id: number;
    }
  | undefined
> {
  const result = await exec.execute(sql`
    select b.id, b.status, b.departure_id, b.seats_requested,
           b.fare_per_seat, r.operator_id
    from ${bookings} b
    join ${routeDepartures} rd on rd.id = b.departure_id
    join ${routes} r on r.id = rd.route_id
    where b.id = ${id}
    for update of b
  `);
  return (
    result as unknown as {
      rows: {
        id: number;
        status: BookingStatus;
        departure_id: number;
        seats_requested: number;
        fare_per_seat: number;
        operator_id: number;
      }[];
    }
  ).rows?.[0];
}

export async function updateBookingStatus(
  id: number,
  status: BookingStatus,
  timestamps: Partial<{
    paymentDeadline: Date | null;
    confirmedAt: Date;
    paidAt: Date;
    boardedAt: Date;
    completedAt: Date;
    cancelledAt: Date;
    rejectionReason: string | null;
    actionedByRepId: number | null;
  }>,
  exec: DbExecutor,
): Promise<void> {
  await exec
    .update(bookings)
    .set({ status, ...timestamps, updatedAt: new Date() })
    .where(eq(bookings.id, id));
}

export async function insertTicket(
  values: { bookingId: number; ticketCode: string; qrToken: string },
  exec: DbExecutor,
) {
  const [row] = await exec.insert(tickets).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

// ── Wallet ──────────────────────────────────────────────────────────────────

/**
 * Credit an operator's pending balance for a paid booking.
 *
 * The ledger row carries a unique index on (booking_id, type), so a webhook
 * delivered twice — which Paystack does — cannot credit the operator twice.
 * `onConflictDoNothing` turns the redelivery into a no-op instead of an error.
 */
export async function creditPendingBalance(
  operatorId: number,
  bookingId: number,
  amount: number,
  description: string,
  exec: DbExecutor,
): Promise<void> {
  const [wallet] = await exec
    .select({ id: wallets.id, pending: wallets.pendingBalance })
    .from(wallets)
    .where(eq(wallets.operatorId, operatorId))
    .limit(1);

  if (!wallet) return;

  const inserted = await exec
    .insert(walletTransactions)
    .values({
      walletId: wallet.id,
      bookingId,
      type: "credit_pending",
      amount,
      balanceAfter: wallet.pending + amount,
      description,
    })
    .onConflictDoNothing()
    .returning({ id: walletTransactions.id });

  if (inserted.length === 0) return;

  await exec
    .update(wallets)
    .set({
      pendingBalance: sql`${wallets.pendingBalance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(wallets.id, wallet.id));
}

export async function findWallet(operatorId: number, exec: DbExecutor = db) {
  const [wallet] = await exec
    .select({
      id: wallets.id,
      pending_balance: wallets.pendingBalance,
      available_balance: wallets.availableBalance,
      withdrawn_total: wallets.withdrawnTotal,
      updated_at: wallets.updatedAt,
    })
    .from(wallets)
    .where(eq(wallets.operatorId, operatorId))
    .limit(1);

  if (!wallet) return undefined;

  const transactions = await exec
    .select({
      id: walletTransactions.id,
      booking_id: walletTransactions.bookingId,
      type: walletTransactions.type,
      amount: walletTransactions.amount,
      balance_after: walletTransactions.balanceAfter,
      description: walletTransactions.description,
      created_at: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.walletId, wallet.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(50);

  return {
    ...wallet,
    updated_at: wallet.updated_at.toISOString(),
    transactions: transactions.map((t) => ({
      ...t,
      created_at: t.created_at.toISOString(),
    })),
  };
}

/** Bookings whose response or payment deadline has passed. Drives the sweeper. */
export async function findExpiredBookings(exec: DbExecutor = db) {
  const now = new Date();
  return exec
    .select({
      id: bookings.id,
      status: bookings.status,
      departureId: bookings.departureId,
      seatsRequested: bookings.seatsRequested,
    })
    .from(bookings)
    .where(
      or(
        and(
          eq(bookings.status, "AWAITING_RESPONSE"),
          lt(bookings.responseDeadline, now),
        ),
        and(
          eq(bookings.status, "AWAITING_PAYMENT"),
          lt(bookings.paymentDeadline, now),
        ),
      ),
    )
    .limit(200);
}
