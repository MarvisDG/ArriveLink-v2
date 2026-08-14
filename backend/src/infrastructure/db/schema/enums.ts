import { pgEnum } from "drizzle-orm/pg-core";

/**
 * PRD §2 — User Roles & Permissions.
 * A single `users` table carries all three roles; an operator rep is additionally
 * joined to an operator through `operator_reps`.
 */
export const userRoleEnum = pgEnum("user_role", [
  "traveler",
  "operator_rep",
  "admin",
]);

/**
 * PRD §5 — Booking State Machine. Exactly the nine documented states.
 *
 *   REQUESTED is not stored: the PRD's own table shows it exiting to
 *   AWAITING_RESPONSE immediately on submit, so it is a transient step, not a
 *   resting state. Bookings are therefore created directly as AWAITING_RESPONSE.
 */
export const bookingStatusEnum = pgEnum("booking_status", [
  "AWAITING_RESPONSE",
  "CONFIRMED",
  "AWAITING_PAYMENT",
  "PAID",
  "TICKET_ISSUED",
  "BOARDED",
  "COMPLETED",
  "REJECTED",
  "CANCELLED_TIMEOUT",
]);

/** PRD §6 — operators.status */
export const operatorStatusEnum = pgEnum("operator_status", [
  "active",
  "suspended",
]);

/** PRD §6 — payments.payment_method */
export const paymentMethodEnum = pgEnum("payment_method", [
  "card",
  "transfer",
]);

/**
 * Payment lifecycle. Driven exclusively by Paystack webhook events
 * (PRD §9 — "All payment status changes must be driven by Paystack webhook
 * events, not client-side confirmation").
 */
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
  "abandoned",
  "refunded",
]);

/**
 * Fare provenance, surfaced on the comparison screen (PRD §3 screen 2) so a
 * traveler can tell a fare the operator confirmed from one we last observed.
 */
export const priceTypeEnum = pgEnum("price_type", ["verified", "last_seen"]);

/** Operational state of a specific departure, shown on the results screen. */
export const departureStatusEnum = pgEnum("departure_status", [
  "available",
  "delayed",
  "full",
  "cancelled",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "under_review",
  "resolved",
  "rejected",
]);

/** Double-entry-ish ledger movements against an operator wallet. */
export const walletTxnTypeEnum = pgEnum("wallet_txn_type", [
  "credit_pending",      // booking PAID — funds held during settlement window
  "release_available",   // COMPLETED — pending becomes withdrawable
  "debit_withdrawal",    // operator withdraws
  "debit_refund",        // dispute resolved for the traveler
  "adjustment",          // manual admin correction
]);

export const conversationSenderEnum = pgEnum("conversation_sender", [
  "user",
  "operator",
]);
