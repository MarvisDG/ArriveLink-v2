import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { userRoleEnum } from "./enums";
import { operatorReps } from "./operator-reps";
import { bookings } from "./bookings";

/**
 * PRD §6 — users: id, name, phone, email, role, created_at.
 *
 * `passwordHash` is an argon2id digest. There is no plaintext password column
 * anywhere in this schema, and no code path that would produce one.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("traveler"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Case-insensitive uniqueness: "Ada@x.com" and "ada@x.com" are one account.
    // Enforced on lower(email) in the database so it holds even if a future
    // caller forgets to normalise before inserting.
    uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
    index("users_role_idx").on(table.role),
    index("users_phone_idx").on(table.phone),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  bookings: many(bookings),
  operatorRep: one(operatorReps, {
    fields: [users.id],
    references: [operatorReps.userId],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
