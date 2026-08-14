import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { bookingStatusEnum } from "./enums";
import { users } from "./users";
import { routeDepartures } from "./routes";
import { payments } from "./payments";
import { tickets } from "./tickets";
import { disputes } from "./disputes";

/**
 * PRD §6 — bookings, and the row the PRD §5 state machine advances.
 *
 * A booking is created as AWAITING_RESPONSE holding real seats. It leaves that
 * state one of three ways: the rep accepts (→ AWAITING_PAYMENT), the rep rejects
 * (→ REJECTED), or the 10-minute deadline passes (→ CANCELLED_TIMEOUT). The last
 * one is driven by a scheduled sweeper, never by a request from the browser —
 * see PRD §5's note that an abandoned tab must not hold a seat.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),

    /**
     * Human-facing identifier printed on the e-ticket and typed by the rep at
     * the terminal to find a booking (PRD §4 screen 12). Short, unambiguous,
     * and never the primary key — sequential integers would leak volume.
     */
    reference: text("reference").notNull(),

    departureId: integer("departure_id")
      .notNull()
      .references(() => routeDepartures.id, { onDelete: "restrict" }),

    /**
     * Null for a guest booking. PRD §3 screen 3 asks only for name, phone and
     * seat count, so an account is not required to reserve.
     */
    travelerId: integer("traveler_id").references(() => users.id, {
      onDelete: "set null",
    }),
    travelerName: text("traveler_name").notNull(),
    travelerPhone: text("traveler_phone").notNull(),
    travelerEmail: text("traveler_email"),

    seatsRequested: integer("seats_requested").notNull(),

    /**
     * Fare per seat in kobo, captured at request time. Copied rather than joined
     * so that an operator editing the route fare afterwards cannot change what
     * an already-quoted traveler owes.
     */
    farePerSeat: bigint("fare_per_seat", { mode: "number" }).notNull(),

    status: bookingStatusEnum("status").notNull().default("AWAITING_RESPONSE"),

    // ── State machine timestamps (PRD §6) ────────────────────────────────────
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** requested_at + 10 minutes. */
    responseDeadline: timestamp("response_deadline", {
      withTimezone: true,
    }).notNull(),
    /** Set on accept: confirmed_at + 25 minutes (PRD's 20–30 min window). */
    paymentDeadline: timestamp("payment_deadline", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    boardedAt: timestamp("boarded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    /** Populated on REJECTED so the traveler sees why, not just that it failed. */
    rejectionReason: text("rejection_reason"),
    /** Which rep acted, for the admin audit trail (PRD §2, admin row). */
    actionedByRepId: integer("actioned_by_rep_id").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("bookings_reference_unique").on(table.reference),
    index("bookings_departure_idx").on(table.departureId),
    index("bookings_traveler_idx").on(table.travelerId),
    index("bookings_phone_idx").on(table.travelerPhone),
    index("bookings_status_idx").on(table.status),

    /**
     * The sweeper's index. It scans for rows whose deadline has passed in one of
     * the two timeout-eligible states; a partial index keeps that scan
     * proportional to the number of *pending* bookings, not to the table.
     */
    index("bookings_response_sweep_idx")
      .on(table.responseDeadline)
      .where(sql`${table.status} = 'AWAITING_RESPONSE'`),
    index("bookings_payment_sweep_idx")
      .on(table.paymentDeadline)
      .where(sql`${table.status} = 'AWAITING_PAYMENT'`),

    check("bookings_seats_positive", sql`${table.seatsRequested} > 0`),
    check("bookings_fare_non_negative", sql`${table.farePerSeat} >= 0`),
  ],
);

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  departure: one(routeDepartures, {
    fields: [bookings.departureId],
    references: [routeDepartures.id],
  }),
  traveler: one(users, {
    fields: [bookings.travelerId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [bookings.id],
    references: [payments.bookingId],
  }),
  ticket: one(tickets, {
    fields: [bookings.id],
    references: [tickets.bookingId],
  }),
  disputes: many(disputes),
}));

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
