import {
  pgTable,
  serial,
  text,
  integer,
  smallint,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { operators } from "./operators";
import { users } from "./users";
import { bookings } from "./bookings";

/**
 * Reviews feed the rating shown on the comparison screen (PRD §3 screen 2).
 *
 * Five dimensions rather than one star value: "which operator is better" is the
 * question the comparison screen exists to answer, and a single blended number
 * hides that one operator is punctual but uncomfortable and the other the
 * reverse.
 *
 * A review must reference a completed booking. That is what stops the ratings
 * from being a review-bombing surface — you cannot rate a bus you never took.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    bookingId: integer("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(),

    ratingPunctuality: smallint("rating_punctuality").notNull(),
    ratingComfort: smallint("rating_comfort").notNull(),
    ratingSafety: smallint("rating_safety").notNull(),
    ratingValue: smallint("rating_value").notNull(),
    ratingProfessionalism: smallint("rating_professionalism").notNull(),

    reviewText: text("review_text"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reviews_operator_idx").on(table.operatorId, table.createdAt),
    // One review per booking — no stacking five reviews off a single trip.
    uniqueIndex("reviews_booking_unique")
      .on(table.bookingId)
      .where(sql`${table.bookingId} is not null`),
    check(
      "reviews_ratings_in_range",
      sql`${table.ratingPunctuality} between 1 and 5
       and ${table.ratingComfort} between 1 and 5
       and ${table.ratingSafety} between 1 and 5
       and ${table.ratingValue} between 1 and 5
       and ${table.ratingProfessionalism} between 1 and 5`,
    ),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  operator: one(operators, {
    fields: [reviews.operatorId],
    references: [operators.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
