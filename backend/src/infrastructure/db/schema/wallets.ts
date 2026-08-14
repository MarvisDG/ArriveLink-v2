import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { operators } from "./operators";
import { bookings } from "./bookings";
import { walletTxnTypeEnum } from "./enums";

/**
 * PRD §6 — wallets: id, operator_id, pending_balance, available_balance.
 * Surfaced as PRD §4 screen 13, the wallet/settlement view.
 *
 * Balances here are a cached projection. `wallet_transactions` is the ledger and
 * the source of truth — a balance can always be rebuilt by summing it, which is
 * what makes a settlement dispute answerable.
 */
export const wallets = pgTable(
  "wallets",
  {
    id: serial("id").primaryKey(),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),

    /** Paid, but still inside the settlement window. Not withdrawable. */
    pendingBalance: bigint("pending_balance", { mode: "number" })
      .notNull()
      .default(0),
    /** Cleared the settlement window with no dispute. Withdrawable. */
    availableBalance: bigint("available_balance", { mode: "number" })
      .notNull()
      .default(0),
    /** Lifetime withdrawn, for the settlement history header. */
    withdrawnTotal: bigint("withdrawn_total", { mode: "number" })
      .notNull()
      .default(0),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("wallets_operator_unique").on(table.operatorId),
    // An operator can never be owed a negative amount.
    check("wallets_pending_non_negative", sql`${table.pendingBalance} >= 0`),
    check("wallets_available_non_negative", sql`${table.availableBalance} >= 0`),
  ],
);

/**
 * Append-only ledger. Rows are never updated or deleted; a correction is a new
 * `adjustment` row. Every balance change on `wallets` is accompanied by exactly
 * one row here, written in the same transaction.
 */
export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),
    walletId: integer("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    bookingId: integer("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),

    type: walletTxnTypeEnum("type").notNull(),
    /** Signed, in kobo. Credits positive, debits negative. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    /** Wallet available balance immediately after this row was applied. */
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    description: text("description"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wallet_txn_wallet_idx").on(table.walletId, table.createdAt),
    index("wallet_txn_booking_idx").on(table.bookingId),
    // A settlement credit must never be recorded twice for the same booking.
    uniqueIndex("wallet_txn_booking_type_unique")
      .on(table.bookingId, table.type)
      .where(sql`${table.bookingId} is not null`),
  ],
);

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  operator: one(operators, {
    fields: [wallets.operatorId],
    references: [operators.id],
  }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
    booking: one(bookings, {
      fields: [walletTransactions.bookingId],
      references: [bookings.id],
    }),
  }),
);

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;
