import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type DbExecutor } from "../client";
import { cities } from "../schema/cities";
import { operators } from "../schema/operators";
import { operatorReps } from "../schema/operator-reps";
import { routes, routeDepartures } from "../schema/routes";

/**
 * Operator-side data access: the rep's own company profile and its routes.
 *
 * Every route mutation takes `operatorId` alongside the route id and filters on
 * both. The ownership check is therefore part of the WHERE clause rather than a
 * separate SELECT-then-decide, so there is no window in which the row could
 * change hands between the check and the write.
 */

/** How far ahead departures are materialised when a route is created. */
const DEPARTURE_HORIZON_DAYS = 21;

export async function findOperatorByInviteCode(
  operatorId: number,
  inviteCode: string,
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .select({
      id: operators.id,
      businessName: operators.businessName,
      status: operators.status,
    })
    .from(operators)
    .where(
      and(eq(operators.id, operatorId), eq(operators.inviteCode, inviteCode)),
    )
    .limit(1);
  return row;
}

export async function createRepForOperator(
  values: {
    operatorId: number;
    userId: number;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  },
  exec: DbExecutor = db,
) {
  const [row] = await exec.insert(operatorReps).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function updateCompanyProfile(
  operatorId: number,
  patch: {
    tagline?: string | null;
    about?: string | null;
    foundedYear?: number | null;
    fleetSize?: number | null;
  },
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .update(operators)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(operators.id, operatorId))
    .returning();
  return row;
}

/**
 * Contact details live on the rep, not the operator — the PRD models whatsapp
 * and phone on operator_reps because they route a specific notification to a
 * specific human.
 */
export async function updateRepContact(
  userId: number,
  patch: { phone?: string | null; whatsapp?: string | null },
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .update(operatorReps)
    .set(patch)
    .where(eq(operatorReps.userId, userId))
    .returning();
  return row;
}

const departureTimesFor = (routeIdColumn: unknown) => sql<string[]>`(
  select coalesce(
    array_agg(distinct to_char(rd.departure_time, 'HH24:MI')
              order by to_char(rd.departure_time, 'HH24:MI')),
    '{}'
  )
  from ${routeDepartures} rd
  where rd.route_id = ${routeIdColumn}
    and rd.departure_date >= current_date
)`;

export async function listOperatorRoutes(
  operatorId: number,
  exec: DbExecutor = db,
) {
  const origin = alias(cities, "origin");
  const destination = alias(cities, "destination");

  const rows = await exec
    .select({
      id: routes.id,
      price: routes.fare,
      price_type: routes.priceType,
      price_verified_date: routes.priceVerifiedDate,
      terminal_location: routes.terminalLocation,
      terminal_address: routes.terminalAddress,
      duration_minutes: routes.durationMinutes,
      is_active: routes.isActive,
      departure_times: departureTimesFor(routes.id),
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
    .where(eq(routes.operatorId, operatorId))
    .orderBy(asc(origin.name), asc(destination.name));

  return rows.map((r) => ({
    id: r.id,
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
    price: r.price,
    price_type: r.price_type,
    price_verified_date: r.price_verified_date,
    departure_times: r.departure_times ?? [],
    terminal_location: r.terminal_location,
    terminal_address: r.terminal_address,
    duration_minutes: r.duration_minutes,
    status: r.is_active ? "available" : "inactive",
    is_active: r.is_active,
  }));
}

/**
 * Materialise one departure row per (date, time) across the horizon.
 *
 * `onConflictDoNothing` against the (route, date, time) unique index makes this
 * safe to re-run when an operator edits the timetable: existing departures keep
 * their seat counts and bookings, and only genuinely new slots are added.
 */
async function generateDepartures(
  routeId: number,
  times: string[],
  seatsTotal: number,
  exec: DbExecutor,
): Promise<number> {
  if (times.length === 0) return 0;

  const rows: {
    routeId: number;
    departureDate: string;
    departureTime: string;
    seatsTotal: number;
    seatsAvailable: number;
  }[] = [];

  for (let day = 0; day < DEPARTURE_HORIZON_DAYS; day += 1) {
    const date = new Date(Date.now() + day * 86_400_000)
      .toISOString()
      .slice(0, 10);
    for (const time of times) {
      rows.push({
        routeId,
        departureDate: date,
        departureTime: time.length === 5 ? `${time}:00` : time,
        seatsTotal,
        seatsAvailable: seatsTotal,
      });
    }
  }

  await exec.insert(routeDepartures).values(rows).onConflictDoNothing();
  return rows.length;
}

export async function createRoute(
  operatorId: number,
  input: {
    originCityId: number;
    destinationCityId: number;
    fare: number;
    priceType?: "verified" | "last_seen";
    departureTimes: string[];
    terminalLocation: string;
    terminalAddress?: string | null;
    durationMinutes?: number | null;
    seatsTotal?: number;
  },
  exec: DbExecutor = db,
) {
  return (exec as typeof db).transaction(async (tx) => {
    const [route] = await tx
      .insert(routes)
      .values({
        operatorId,
        originCityId: input.originCityId,
        destinationCityId: input.destinationCityId,
        fare: input.fare,
        priceType: input.priceType ?? "last_seen",
        priceVerifiedDate:
          input.priceType === "verified"
            ? new Date().toISOString().slice(0, 10)
            : null,
        terminalLocation: input.terminalLocation,
        terminalAddress: input.terminalAddress ?? null,
        durationMinutes: input.durationMinutes ?? null,
        seatsTotal: input.seatsTotal ?? 14,
      })
      .returning();

    if (!route) throw new Error("Insert returned no row");

    await generateDepartures(
      route.id,
      input.departureTimes,
      route.seatsTotal,
      tx as unknown as DbExecutor,
    );

    return route;
  });
}

export async function updateRoute(
  routeId: number,
  operatorId: number,
  patch: {
    fare?: number;
    priceType?: "verified" | "last_seen";
    terminalLocation?: string;
    terminalAddress?: string | null;
    durationMinutes?: number | null;
    isActive?: boolean;
    departureTimes?: string[];
  },
  exec: DbExecutor = db,
) {
  return (exec as typeof db).transaction(async (tx) => {
    const { departureTimes, ...columns } = patch;

    const [route] = await tx
      .update(routes)
      .set({
        ...columns,
        ...(columns.priceType === "verified"
          ? { priceVerifiedDate: new Date().toISOString().slice(0, 10) }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(routes.id, routeId), eq(routes.operatorId, operatorId)))
      .returning();

    if (!route) return undefined;

    if (departureTimes) {
      await generateDepartures(
        route.id,
        departureTimes,
        route.seatsTotal,
        tx as unknown as DbExecutor,
      );
    }

    return route;
  });
}

/**
 * Soft delete.
 *
 * Bookings, payments and tickets reference a route. Hard-deleting one would
 * either cascade a traveler's paid ticket out of existence or fail on the
 * foreign key; deactivating removes it from search while the history stays
 * intact and auditable.
 */
export async function deactivateRoute(
  routeId: number,
  operatorId: number,
  exec: DbExecutor = db,
): Promise<boolean> {
  const [row] = await exec
    .update(routes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(routes.id, routeId), eq(routes.operatorId, operatorId)))
    .returning({ id: routes.id });
  return Boolean(row);
}

export async function setInviteCode(
  operatorId: number,
  inviteCode: string | null,
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .update(operators)
    .set({ inviteCode, updatedAt: new Date() })
    .where(eq(operators.id, operatorId))
    .returning({ id: operators.id, invite_code: operators.inviteCode });
  return row;
}
