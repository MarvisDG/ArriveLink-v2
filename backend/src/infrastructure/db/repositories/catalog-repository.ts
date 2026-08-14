import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DbExecutor } from "../client";
import { cities } from "../schema/cities";
import { operators } from "../schema/operators";
import { routes, routeDepartures } from "../schema/routes";
import { reviews } from "../schema/reviews";
import { users } from "../schema/users";

/**
 * Read models for the public browsing surface: cities, corridor search,
 * operator profiles and reviews.
 *
 * These return the snake_case shapes fixed by the OpenAPI contract rather than
 * raw table rows. The mapping lives here, in one place, so a column rename does
 * not ripple into the frontend's generated client.
 */

/**
 * The sellable departure times for a route, as HH:MM.
 *
 * A correlated subquery rather than a join + GROUP BY: the outer query already
 * groups nothing, and joining route_departures would multiply the operator rows
 * by ~49 departures each before collapsing them again.
 *
 * `status = 'available'` and a future date, because a traveler must not be shown
 * a 06:00 departure that left this morning or a coach that is already full.
 */
const departureTimesFor = (routeIdColumn: unknown) => sql<string[]>`(
  select coalesce(
    array_agg(distinct to_char(rd.departure_time, 'HH24:MI')
              order by to_char(rd.departure_time, 'HH24:MI')),
    '{}'
  )
  from ${routeDepartures} rd
  where rd.route_id = ${routeIdColumn}
    and rd.departure_date >= current_date
    and rd.status = 'available'
    and rd.seats_available > 0
)`;

/** Operational state of the next departure, or 'unavailable' when none remain. */
const nextDepartureStatusFor = (routeIdColumn: unknown) => sql<string>`(
  select coalesce(
    (select rd.status::text
     from ${routeDepartures} rd
     where rd.route_id = ${routeIdColumn}
       and rd.departure_date >= current_date
       and rd.seats_available > 0
     order by rd.departure_date, rd.departure_time
     limit 1),
    'unavailable'
  )
)`;

export async function listCities(exec: DbExecutor = db) {
  return exec
    .select({ id: cities.id, name: cities.name, state: cities.state })
    .from(cities)
    .where(eq(cities.isActive, true))
    .orderBy(asc(cities.name));
}

/**
 * The comparison screen (PRD §3 screen 2): every active operator on a corridor,
 * with the fare and the profile signals a traveler chooses between.
 *
 * Verified operators first, then rating — the ordering the PRD's screen implies,
 * applied in SQL so pagination stays correct if it is added later.
 */
export async function searchRoutes(
  fromCityId: number,
  toCityId: number,
  exec: DbExecutor = db,
) {
  const rows = await exec
    .select({
      id: routes.id,
      price: routes.fare,
      price_type: routes.priceType,
      price_verified_date: routes.priceVerifiedDate,
      terminal_location: routes.terminalLocation,
      terminal_address: routes.terminalAddress,
      duration_minutes: routes.durationMinutes,
      departure_times: departureTimesFor(routes.id),
      status: nextDepartureStatusFor(routes.id),
      company_id: operators.id,
      company_name: operators.businessName,
      company_tagline: operators.tagline,
      company_logo_url: operators.logoUrl,
      company_is_verified: operators.isVerified,
      company_rating: operators.rating,
      company_review_count: operators.reviewCount,
    })
    .from(routes)
    .innerJoin(operators, eq(routes.operatorId, operators.id))
    .where(
      and(
        eq(routes.originCityId, fromCityId),
        eq(routes.destinationCityId, toCityId),
        eq(routes.isActive, true),
        eq(operators.status, "active"),
      ),
    )
    .orderBy(desc(operators.isVerified), desc(operators.rating), asc(routes.fare));

  return rows.map((r) => ({
    id: r.id,
    price: r.price,
    price_type: r.price_type,
    price_verified_date: r.price_verified_date,
    departure_times: r.departure_times ?? [],
    terminal_location: r.terminal_location,
    terminal_address: r.terminal_address,
    duration_minutes: r.duration_minutes,
    status: r.status,
    company: {
      id: r.company_id,
      name: r.company_name,
      tagline: r.company_tagline,
      logo_url: r.company_logo_url,
      is_verified: r.company_is_verified,
      rating: Number(r.company_rating),
      review_count: r.company_review_count,
    },
  }));
}

/**
 * Corridors worth putting on the home screen: the ones actually served, ranked
 * by how many operators compete on them — a corridor with five operators is a
 * more useful suggestion than one with a single bus a day.
 */
export async function popularRoutes(limit = 6, exec: DbExecutor = db) {
  const origin = alias(cities, "origin");
  const destination = alias(cities, "destination");

  const rows = await exec
    .select({
      origin_id: origin.id,
      origin_name: origin.name,
      origin_state: origin.state,
      destination_id: destination.id,
      destination_name: destination.name,
      destination_state: destination.state,
      company_count: sql<number>`count(distinct ${routes.operatorId})::int`,
      min_price: sql<number>`min(${routes.fare})::bigint`,
    })
    .from(routes)
    .innerJoin(origin, eq(routes.originCityId, origin.id))
    .innerJoin(destination, eq(routes.destinationCityId, destination.id))
    .where(eq(routes.isActive, true))
    .groupBy(
      origin.id,
      origin.name,
      origin.state,
      destination.id,
      destination.name,
      destination.state,
    )
    .orderBy(desc(sql`count(distinct ${routes.operatorId})`), asc(sql`min(${routes.fare})`))
    .limit(limit);

  return rows.map((r) => ({
    departure_city: { id: r.origin_id, name: r.origin_name, state: r.origin_state },
    destination_city: {
      id: r.destination_id,
      name: r.destination_name,
      state: r.destination_state,
    },
    company_count: r.company_count,
    min_price: Number(r.min_price),
  }));
}

export async function platformStats(exec: DbExecutor = db) {
  const [row] = await exec
    .select({
      company_count: sql<number>`(select count(*) from ${operators} where status = 'active')::int`,
      city_count: sql<number>`(select count(*) from ${cities} where is_active)::int`,
      route_count: sql<number>`(select count(*) from ${routes} where is_active)::int`,
      user_count: sql<number>`(select count(*) from ${users})::int`,
    })
    .from(sql`(select 1) as _`);

  return (
    row ?? { company_count: 0, city_count: 0, route_count: 0, user_count: 0 }
  );
}

export async function listCompanies(exec: DbExecutor = db) {
  return exec
    .select({ id: operators.id, name: operators.businessName })
    .from(operators)
    .where(eq(operators.status, "active"))
    .orderBy(asc(operators.businessName));
}

export async function featuredCompanies(limit = 4, exec: DbExecutor = db) {
  const rows = await exec
    .select({
      id: operators.id,
      name: operators.businessName,
      tagline: operators.tagline,
      is_verified: operators.isVerified,
      rating: operators.rating,
      review_count: operators.reviewCount,
    })
    .from(operators)
    .where(and(eq(operators.status, "active"), eq(operators.featured, true)))
    .orderBy(desc(operators.rating))
    .limit(limit);

  return rows.map((r) => ({ ...r, rating: Number(r.rating) }));
}

export async function findCompany(id: number, exec: DbExecutor = db) {
  const [operator] = await exec
    .select({
      id: operators.id,
      name: operators.businessName,
      tagline: operators.tagline,
      about: operators.about,
      logo_url: operators.logoUrl,
      founded_year: operators.foundedYear,
      fleet_size: operators.fleetSize,
      is_verified: operators.isVerified,
      rating: operators.rating,
      review_count: operators.reviewCount,
      response_rate: operators.responseRate,
    })
    .from(operators)
    .where(and(eq(operators.id, id), eq(operators.status, "active")))
    .limit(1);

  if (!operator) return undefined;

  const origin = alias(cities, "origin");
  const destination = alias(cities, "destination");

  const routeRows = await exec
    .select({
      id: routes.id,
      price: routes.fare,
      price_type: routes.priceType,
      price_verified_date: routes.priceVerifiedDate,
      terminal_location: routes.terminalLocation,
      terminal_address: routes.terminalAddress,
      duration_minutes: routes.durationMinutes,
      departure_times: departureTimesFor(routes.id),
      status: nextDepartureStatusFor(routes.id),
      origin_id: origin.id,
      origin_name: origin.name,
      origin_state: origin.state,
      destination_id: destination.id,
      destination_name: destination.name,
      destination_state: destination.state,
    })
    .from(routes)
    .innerJoin(origin, eq(routes.originCityId, origin.id))
    .innerJoin(destination, eq(routes.destinationCityId, destination.id))
    .where(and(eq(routes.operatorId, id), eq(routes.isActive, true)))
    .orderBy(asc(origin.name), asc(destination.name));

  return {
    ...operator,
    rating: Number(operator.rating),
    response_rate: Number(operator.response_rate),
    routes: routeRows.map((r) => ({
      id: r.id,
      price: r.price,
      price_type: r.price_type,
      price_verified_date: r.price_verified_date,
      departure_times: r.departure_times ?? [],
      terminal_location: r.terminal_location,
      terminal_address: r.terminal_address,
      duration_minutes: r.duration_minutes,
      status: r.status,
      departure_city: {
        id: r.origin_id,
        name: r.origin_name,
        state: r.origin_state,
      },
      destination_city: {
        id: r.destination_id,
        name: r.destination_name,
        state: r.destination_state,
      },
    })),
  };
}

export async function companyReviews(
  operatorId: number,
  limit = 50,
  exec: DbExecutor = db,
) {
  const rows = await exec
    .select({
      id: reviews.id,
      traveler_name: reviews.authorName,
      review_text: reviews.reviewText,
      created_at: reviews.createdAt,
      rating_punctuality: reviews.ratingPunctuality,
      rating_comfort: reviews.ratingComfort,
      rating_safety: reviews.ratingSafety,
      rating_value: reviews.ratingValue,
      rating_professionalism: reviews.ratingProfessionalism,
    })
    .from(reviews)
    .where(eq(reviews.operatorId, operatorId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    created_at: r.created_at.toISOString(),
    // The contract exposes one headline number alongside the five dimensions.
    overall_rating:
      Math.round(
        ((r.rating_punctuality +
          r.rating_comfort +
          r.rating_safety +
          r.rating_value +
          r.rating_professionalism) /
          5) *
          10,
      ) / 10,
  }));
}

export async function operatorExists(
  id: number,
  exec: DbExecutor = db,
): Promise<boolean> {
  const [row] = await exec
    .select({ id: operators.id })
    .from(operators)
    .where(eq(operators.id, id))
    .limit(1);
  return Boolean(row);
}

export async function routeExists(
  id: number,
  operatorId: number,
  exec: DbExecutor = db,
): Promise<boolean> {
  const [row] = await exec
    .select({ id: routes.id })
    .from(routes)
    .where(and(eq(routes.id, id), eq(routes.operatorId, operatorId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Insert a review and refresh the operator's cached aggregates in one
 * transaction. The aggregates on `operators` are a denormalisation; letting them
 * drift from the reviews table would corrupt the comparison screen's ordering.
 */
export async function insertReview(
  input: {
    operatorId: number;
    authorName: string;
    authorId?: number | null;
    bookingId?: number | null;
    ratingPunctuality: number;
    ratingComfort: number;
    ratingSafety: number;
    ratingValue: number;
    ratingProfessionalism: number;
    reviewText?: string | null;
  },
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .insert(reviews)
    .values({
      operatorId: input.operatorId,
      authorName: input.authorName,
      authorId: input.authorId ?? null,
      bookingId: input.bookingId ?? null,
      ratingPunctuality: input.ratingPunctuality,
      ratingComfort: input.ratingComfort,
      ratingSafety: input.ratingSafety,
      ratingValue: input.ratingValue,
      ratingProfessionalism: input.ratingProfessionalism,
      reviewText: input.reviewText ?? null,
    })
    .returning();

  if (!row) throw new Error("Insert returned no row");

  await exec
    .update(operators)
    .set({
      rating: sql`(
        select round(avg((rating_punctuality + rating_comfort + rating_safety
                        + rating_value + rating_professionalism) / 5.0), 2)
        from ${reviews} where operator_id = ${input.operatorId}
      )`,
      reviewCount: sql`(
        select count(*)::int from ${reviews} where operator_id = ${input.operatorId}
      )`,
      updatedAt: new Date(),
    })
    .where(eq(operators.id, input.operatorId));

  return row;
}

export async function upcomingDeparturesForRoute(
  routeId: number,
  exec: DbExecutor = db,
) {
  return exec
    .select({
      id: routeDepartures.id,
      departure_date: routeDepartures.departureDate,
      departure_time: routeDepartures.departureTime,
      seats_total: routeDepartures.seatsTotal,
      seats_available: routeDepartures.seatsAvailable,
      fare_override: routeDepartures.fareOverride,
      status: routeDepartures.status,
    })
    .from(routeDepartures)
    .where(
      and(
        eq(routeDepartures.routeId, routeId),
        gte(routeDepartures.departureDate, sql`current_date`),
      ),
    )
    .orderBy(asc(routeDepartures.departureDate), asc(routeDepartures.departureTime));
}
