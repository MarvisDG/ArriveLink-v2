import {
  pgTable,
  serial,
  text,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * Cities are normalised rather than free-text origin/destination strings
 * (which is what PRD §6 sketches for `routes`). Search compares operators on a
 * corridor (PRD §3 screen 2); that comparison is only meaningful if every
 * operator's "Benin City" is the same row.
 */
export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    state: text("state").notNull(),
    /** URL-safe identifier used in shareable search links. */
    slug: text("slug").notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("cities_slug_unique").on(table.slug),
    uniqueIndex("cities_name_state_unique").on(table.name, table.state),
  ],
);

export type City = typeof cities.$inferSelect;
export type NewCity = typeof cities.$inferInsert;
