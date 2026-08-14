import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { bookings } from "./bookings";
import { users } from "./users";
import { disputeStatusEnum } from "./enums";

/**
 * PRD §6 — disputes: id, booking_id, raised_by, reason, resolution, resolved_at.
 *
 * An open dispute is what holds funds in the operator's pending balance past the
 * settlement window (PRD §5 — COMPLETED is entered when "the settlement window
 * passes with no dispute"). Resolved by an admin (PRD §2, admin row).
 */
export const disputes = pgTable(
  "disputes",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    raisedBy: integer("raised_by").references(() => users.id, {
      onDelete: "set null",
    }),

    reason: text("reason").notNull(),
    status: disputeStatusEnum("status").notNull().default("open"),
    resolution: text("resolution"),
    resolvedBy: integer("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("disputes_booking_idx").on(table.bookingId),
    index("disputes_status_idx").on(table.status),
  ],
);

export const disputesRelations = relations(disputes, ({ one }) => ({
  booking: one(bookings, {
    fields: [disputes.bookingId],
    references: [bookings.id],
  }),
  raiser: one(users, {
    fields: [disputes.raisedBy],
    references: [users.id],
  }),
}));

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
