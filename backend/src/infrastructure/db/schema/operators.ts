import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { operatorStatusEnum } from "./enums";
import { operatorReps } from "./operator-reps";
import { routes } from "./routes";
import { reviews } from "./reviews";
import { wallets } from "./wallets";

/**
 * PRD §6 — operators: id, business_name, status, onboarded_at.
 *
 * The profile columns beyond those four exist to serve PRD §3 screen 2, the
 * operator comparison screen: a traveler choosing between two operators on the
 * same corridor needs something to compare besides price.
 *
 * Operators are onboarded manually by ArriveLink for the first cohort
 * (PRD §10 — self-serve registration is explicitly out of scope for MVP), so
 * there is no public write path to this table.
 */
export const operators = pgTable(
  "operators",
  {
    id: serial("id").primaryKey(),
    businessName: text("business_name").notNull(),
    slug: text("slug").notNull(),
    status: operatorStatusEnum("status").notNull().default("active"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // ── Comparison-screen profile ────────────────────────────────────────────
    tagline: text("tagline"),
    about: text("about"),
    logoUrl: text("logo_url"),
    foundedYear: integer("founded_year"),
    fleetSize: integer("fleet_size"),

    /**
     * Earned, never purchased — PRD §10 rules out paid verification badges at
     * this stage. Set by an admin during manual onboarding.
     */
    isVerified: boolean("is_verified").notNull().default(false),
    /**
     * Featured placement is a Phase 7 revenue stream in the Blueprint (§5,
     * Month 6 relaunch). The column exists now so the ordering logic is in
     * place; nothing sells it yet.
     */
    featured: boolean("featured").notNull().default(false),

    /**
     * Single-use-ish code an admin issues at onboarding so a rep can claim the
     * operator account themselves (PRD §4 screen 8).
     *
     * This is what keeps operator signup consistent with PRD §10's "no
     * self-serve registration": anyone can POST to the signup endpoint, but
     * without a code an admin handed out, no account is created. Null means the
     * operator is not currently accepting new reps.
     */
    inviteCode: text("invite_code"),

    // ── Denormalised review aggregates ───────────────────────────────────────
    // Recomputed on review write. Kept on the row because the results screen
    // sorts and filters by rating across every operator on a corridor, and an
    // aggregate subquery there is the query that falls over first under load.
    rating: numeric("rating", { precision: 3, scale: 2 })
      .notNull()
      .default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    /** Share of reservation requests answered inside the 10-minute window. */
    responseRate: numeric("response_rate", { precision: 4, scale: 3 })
      .notNull()
      .default("0"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("operators_slug_unique").on(table.slug),
    index("operators_status_idx").on(table.status),
    index("operators_featured_idx").on(table.featured),
    // Partial: two operators may both have no code, but a live code must
    // identify exactly one operator or signup could not resolve it.
    uniqueIndex("operators_invite_code_unique")
      .on(table.inviteCode)
      .where(sql`${table.inviteCode} is not null`),
  ],
);

export const operatorsRelations = relations(operators, ({ many, one }) => ({
  reps: many(operatorReps),
  routes: many(routes),
  reviews: many(reviews),
  wallet: one(wallets, {
    fields: [operators.id],
    references: [wallets.operatorId],
  }),
}));

export type Operator = typeof operators.$inferSelect;
export type NewOperator = typeof operators.$inferInsert;
