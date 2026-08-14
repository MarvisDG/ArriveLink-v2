/**
 * PRD §5 — Booking State Machine, expressed as data.
 *
 * The transition table is the specification. Every state change in the
 * application goes through `assertTransition`, so an illegal move (paying a
 * rejected booking, boarding an unpaid one, a rep accepting twice) fails in one
 * place with one error, rather than depending on each call site remembering to
 * check. Adding a state means editing this table and nothing else compiles until
 * the new cases are handled.
 */

export const BOOKING_STATUSES = [
  "AWAITING_RESPONSE",
  "CONFIRMED",
  "AWAITING_PAYMENT",
  "PAID",
  "TICKET_ISSUED",
  "BOARDED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED_TIMEOUT",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * The allowed moves. Read as: from this state, you may go to these.
 *
 *   AWAITING_RESPONSE → CONFIRMED       rep accepts
 *                     → REJECTED         rep declines
 *                     → CANCELLED_TIMEOUT 10-minute deadline passes
 *   CONFIRMED         → AWAITING_PAYMENT payment request raised
 *   AWAITING_PAYMENT  → PAID             Paystack webhook confirms
 *                     → CANCELLED_TIMEOUT 20–30-minute deadline passes
 *   PAID              → TICKET_ISSUED    automatic, same transaction
 *   TICKET_ISSUED     → BOARDED          rep confirms at the terminal
 *   BOARDED           → COMPLETED        settlement window passes, no dispute
 */
const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  AWAITING_RESPONSE: ["CONFIRMED", "REJECTED", "CANCELLED_TIMEOUT"],
  // CONFIRMED is a pass-through: the PRD raises the payment request immediately
  // on acceptance. It is a distinct state so that "the rep said yes" and "the
  // traveler can now pay" remain separately observable when payment setup fails.
  CONFIRMED: ["AWAITING_PAYMENT", "CANCELLED_TIMEOUT"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED_TIMEOUT"],
  PAID: ["TICKET_ISSUED"],
  TICKET_ISSUED: ["BOARDED"],
  BOARDED: ["COMPLETED"],
  // Terminal states. Nothing leaves them.
  COMPLETED: [],
  REJECTED: [],
  CANCELLED_TIMEOUT: [],
};

/** States from which no further transition is possible. */
export const TERMINAL_STATUSES = [
  "COMPLETED",
  "REJECTED",
  "CANCELLED_TIMEOUT",
] as const satisfies readonly BookingStatus[];

/**
 * States that hold seat inventory. A booking in one of these has decremented
 * `seats_available`; leaving them for a terminal state must return the seats.
 */
export const SEAT_HOLDING_STATUSES = [
  "AWAITING_RESPONSE",
  "CONFIRMED",
  "AWAITING_PAYMENT",
  "PAID",
  "TICKET_ISSUED",
  "BOARDED",
] as const satisfies readonly BookingStatus[];

/** States the timeout sweeper may act on, with the deadline column it reads. */
export const TIMEOUT_RULES = [
  { status: "AWAITING_RESPONSE", deadline: "responseDeadline" },
  { status: "AWAITING_PAYMENT", deadline: "paymentDeadline" },
] as const;

export function isTerminal(status: BookingStatus): boolean {
  return (TERMINAL_STATUSES as readonly BookingStatus[]).includes(status);
}

export function holdsSeats(status: BookingStatus): boolean {
  return (SEAT_HOLDING_STATUSES as readonly BookingStatus[]).includes(status);
}

export function canTransition(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Returns true when moving from → to must release the held seats. */
export function releasesSeats(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  return holdsSeats(from) && !holdsSeats(to);
}

export class InvalidBookingTransitionError extends Error {
  readonly code = "INVALID_BOOKING_TRANSITION";
  readonly status = 409;

  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
  ) {
    super(
      `Cannot move a booking from ${from} to ${to}. ` +
        (TRANSITIONS[from].length === 0
          ? `${from} is a terminal state.`
          : `Allowed from ${from}: ${TRANSITIONS[from].join(", ")}.`),
    );
    this.name = "InvalidBookingTransitionError";
  }
}

export function assertTransition(
  from: BookingStatus,
  to: BookingStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidBookingTransitionError(from, to);
  }
}

/** Traveler-facing copy for each state. Single source for UI status text. */
export const STATUS_LABELS: Readonly<Record<BookingStatus, string>> = {
  AWAITING_RESPONSE: "Awaiting operator response",
  CONFIRMED: "Confirmed by operator",
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Payment received",
  TICKET_ISSUED: "Ticket issued",
  BOARDED: "Boarded",
  COMPLETED: "Completed",
  REJECTED: "Declined by operator",
  CANCELLED_TIMEOUT: "Cancelled — time expired",
};
