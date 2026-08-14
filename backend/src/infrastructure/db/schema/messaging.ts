import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { operators } from "./operators";
import { users } from "./users";
import { conversationSenderEnum } from "./enums";

/**
 * Traveler ↔ operator-rep messaging. Not a PRD MVP screen, but it is how a
 * traveler resolves "which terminal exactly?" before committing to a
 * reservation, and it already exists in the product. Kept, and kept small.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    /** Null for a guest enquiry, matching the guest booking path. */
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    guestName: text("guest_name"),
    guestEmail: text("guest_email"),

    unreadUser: integer("unread_user").notNull().default(0),
    unreadOperator: integer("unread_operator").notNull().default(0),

    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("conversations_operator_idx").on(
      table.operatorId,
      table.lastMessageAt,
    ),
    index("conversations_user_idx").on(table.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderType: conversationSenderEnum("sender_type").notNull(),
    senderName: text("sender_name").notNull(),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_conversation_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    operator: one(operators, {
      fields: [conversations.operatorId],
      references: [operators.id],
    }),
    user: one(users, {
      fields: [conversations.userId],
      references: [users.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
