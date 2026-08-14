import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { operators } from "./operators";
import { users } from "./users";

/**
 * PRD §6 — operator_reps: id, operator_id, user_id, phone, whatsapp, email.
 *
 * The rep is the human who accepts or rejects a reservation inside the
 * 10-minute window. Credentials are created by an admin at onboarding
 * (PRD §4 screen 8), so `userId` always points at an existing users row with
 * role = 'operator_rep'.
 */
export const operatorReps = pgTable(
  "operator_reps",
  {
    id: serial("id").primaryKey(),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    /**
     * Where the new-request notification goes (PRD §7). A rep can be paused
     * without deleting the account — useful when a terminal changes staff.
     */
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One rep record per user. A person reps exactly one operator.
    uniqueIndex("operator_reps_user_unique").on(table.userId),
    index("operator_reps_operator_idx").on(table.operatorId),
  ],
);

export const operatorRepsRelations = relations(operatorReps, ({ one }) => ({
  operator: one(operators, {
    fields: [operatorReps.operatorId],
    references: [operators.id],
  }),
  user: one(users, {
    fields: [operatorReps.userId],
    references: [users.id],
  }),
}));

export type OperatorRep = typeof operatorReps.$inferSelect;
export type NewOperatorRep = typeof operatorReps.$inferInsert;
