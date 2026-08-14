import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  // PRD §7: added "once volume justifies the Meta Cloud API cost". The channel
  // is modelled now so adding it later is a driver, not a schema change.
  "whatsapp",
  "sms",
  "in_app",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sending",
  "sent",
  "failed",
]);

/**
 * PRD §7 — notifications, as a transactional outbox rather than a direct send.
 *
 * The rep's new-request email is the one that starts the 10-minute clock. If it
 * were sent inline with the HTTP request, a Resend outage would either fail the
 * booking or silently drop the notification. Instead the row is written in the
 * same transaction as the booking, and a worker delivers it with retries — the
 * booking and the intent to notify commit or roll back together.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    recipientId: integer("recipient_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    /** Guest bookings have no user row, so the address is carried directly. */
    recipientAddress: text("recipient_address").notNull(),

    channel: notificationChannelEnum("channel").notNull().default("email"),
    status: notificationStatusEnum("status").notNull().default("queued"),

    /** Template key, e.g. "booking.requested.rep" — not a rendered body. */
    template: text("template").notNull(),
    subject: text("subject"),
    /** Template variables: deadline, booking reference, route, fare. */
    payload: jsonb("payload"),

    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** Exponential backoff target; the worker only picks up due rows. */
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The worker's claim query: due, still queued. Partial, so the index stays
    // the size of the backlog rather than the size of all mail ever sent.
    index("notifications_due_idx")
      .on(table.nextAttemptAt)
      .where(sql`${table.status} in ('queued', 'failed')`),
    index("notifications_recipient_idx").on(table.recipientId, table.createdAt),
  ],
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
