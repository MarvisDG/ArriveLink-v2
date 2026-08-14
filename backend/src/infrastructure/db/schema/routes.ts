import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  time,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { operators } from "./operators";
import { cities } from "./cities";
import { priceTypeEnum, departureStatusEnum } from "./enums";
import { bookings } from "./bookings";

/**
 * PRD §6 — routes: id, operator_id, origin, destination, fare, departure_time,
 * seats_total, seats_available, active.
 *
 * ── Deliberate refinement, flagged ───────────────────────────────────────────
 * The PRD puts `departure_time`, `seats_total` and `seats_available` directly on
 * `routes`. That works for exactly one departure. The moment an operator runs
 * "Lagos → Abuja at 06:00, 09:00 and 14:00", a single seats_available column
 * cannot say which of the three is full, and tomorrow's 06:00 bus shares a seat
 * count with today's.
 *
 * PRD §9 requires that "no two simultaneous requests can both claim the last
 * seat". That guarantee is not expressible without knowing *which* departure the
 * seat belongs to. So inventory moves to `route_departures`, one row per
 * (route, date, time), and `routes` keeps the parts that do not vary per
 * departure: corridor, operator, terminal, fare.
 */
export const routes = pgTable(
  "routes",
  {
    id: serial("id").primaryKey(),
    operatorId: integer("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    originCityId: integer("origin_city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "restrict" }),
    destinationCityId: integer("destination_city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "restrict" }),

    /** Base fare per seat, in kobo. ₦15,000 is stored as 1500000. */
    fare: bigint("fare", { mode: "number" }).notNull(),
    priceType: priceTypeEnum("price_type").notNull().default("last_seen"),
    priceVerifiedDate: date("price_verified_date"),

    /** Default bus capacity; copied onto each departure as it is created. */
    seatsTotal: integer("seats_total").notNull().default(14),

    terminalLocation: text("terminal_location").notNull(),
    terminalAddress: text("terminal_address"),
    /** Minutes; powers the "≈ 8h 30m" line on the comparison screen. */
    durationMinutes: integer("duration_minutes"),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("routes_operator_idx").on(table.operatorId),
    // The search query: origin + destination + active. Composite, in that order.
    index("routes_corridor_idx").on(
      table.originCityId,
      table.destinationCityId,
      table.isActive,
    ),
    check("routes_fare_positive", sql`${table.fare} > 0`),
    check(
      "routes_distinct_cities",
      sql`${table.originCityId} <> ${table.destinationCityId}`,
    ),
  ],
);

/**
 * One sellable departure: a route on a specific date at a specific time.
 * This is the row a booking actually consumes a seat from.
 */
export const routeDepartures = pgTable(
  "route_departures",
  {
    id: serial("id").primaryKey(),
    routeId: integer("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    departureDate: date("departure_date").notNull(),
    departureTime: time("departure_time").notNull(),

    seatsTotal: integer("seats_total").notNull(),
    /**
     * Decremented when a seat is held, restored on REJECTED or
     * CANCELLED_TIMEOUT. Every write goes through a `SELECT ... FOR UPDATE` on
     * this row, and the check constraint below is the last line of defence: even
     * a buggy future caller cannot drive this negative, the transaction aborts.
     */
    seatsAvailable: integer("seats_available").notNull(),

    /** Per-departure fare override in kobo; falls back to routes.fare. */
    fareOverride: bigint("fare_override", { mode: "number" }),
    status: departureStatusEnum("status").notNull().default("available"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("route_departures_slot_unique").on(
      table.routeId,
      table.departureDate,
      table.departureTime,
    ),
    index("route_departures_date_idx").on(table.departureDate, table.status),
    check(
      "route_departures_seats_non_negative",
      sql`${table.seatsAvailable} >= 0`,
    ),
    check(
      "route_departures_seats_within_capacity",
      sql`${table.seatsAvailable} <= ${table.seatsTotal}`,
    ),
  ],
);

export const routesRelations = relations(routes, ({ one, many }) => ({
  operator: one(operators, {
    fields: [routes.operatorId],
    references: [operators.id],
  }),
  originCity: one(cities, {
    fields: [routes.originCityId],
    references: [cities.id],
    relationName: "origin",
  }),
  destinationCity: one(cities, {
    fields: [routes.destinationCityId],
    references: [cities.id],
    relationName: "destination",
  }),
  departures: many(routeDepartures),
}));

export const routeDeparturesRelations = relations(
  routeDepartures,
  ({ one, many }) => ({
    route: one(routes, {
      fields: [routeDepartures.routeId],
      references: [routes.id],
    }),
    bookings: many(bookings),
  }),
);

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
export type RouteDeparture = typeof routeDepartures.$inferSelect;
export type NewRouteDeparture = typeof routeDepartures.$inferInsert;
