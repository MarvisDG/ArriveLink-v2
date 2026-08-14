import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

/**
 * Refresh-token store.
 *
 * Only a SHA-256 hash of the token is kept. A leaked database dump therefore
 * cannot be replayed as a session, which is the same reasoning that applies to
 * password hashing.
 *
 * Rotation: each use issues a new token and sets `replacedById` on the old one.
 * If a token that has already been replaced is presented again, that is a replay
 * of a stolen token, and the whole chain is revoked.
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedById: integer("replaced_by_id"),

    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("refresh_tokens_hash_unique").on(table.tokenHash),
    index("refresh_tokens_user_idx").on(table.userId),
    index("refresh_tokens_expiry_idx").on(table.expiresAt),
  ],
);

/**
 * PRD §2 — the admin role can "view audit logs".
 *
 * Append-only. Records who did what to which entity, for the actions where the
 * answer matters later: accepting or rejecting a reservation, resolving a
 * dispute, adjusting a wallet, verifying an operator.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Denormalised: the log must survive the actor being deleted. */
    actorLabel: text("actor_label"),

    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    /** Before/after snapshot, enough to reconstruct what changed. */
    metadata: jsonb("metadata"),

    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_idx").on(table.actorId, table.createdAt),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
