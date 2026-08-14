import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { bookings } from "./bookings";

/**
 * PRD §6 — tickets: id, booking_id, ticket_code, issued_at.
 *
 * Issued automatically the moment a booking reaches PAID (PRD §8 step 16 —
 * "ticket generation triggers automatically, no manual step"), inside the same
 * transaction that records the payment, so a paid booking without a ticket is
 * not a state the database can hold.
 */
export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),

    /** Scanned or read aloud at boarding. Distinct from bookings.reference. */
    ticketCode: text("ticket_code").notNull(),
    /**
     * Signed payload encoded into the QR on the e-ticket screen (PRD §3
     * screen 6). Signed so a screenshot of someone else's ticket cannot be
     * edited into a valid one.
     */
    qrToken: text("qr_token").notNull(),

    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set when the rep scans it; a second scan is then detectably a reuse. */
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("tickets_booking_unique").on(table.bookingId),
    uniqueIndex("tickets_code_unique").on(table.ticketCode),
  ],
);

export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, {
    fields: [tickets.bookingId],
    references: [bookings.id],
  }),
}));

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
