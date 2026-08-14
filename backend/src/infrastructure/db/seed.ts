import { sql } from "drizzle-orm";
import { db, closeConnection } from "./client";
import * as s from "./schema";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { hashPassword } from "../auth/password";
import { slugify, generateBookingReference } from "../../domain/shared/identifiers";

/**
 * Development seed: a small but realistic slice of the Nigerian intercity market.
 *
 * The corridors mirror the Blueprint's launch focus (Benin City, §5 Phase 6) plus
 * the Lagos/Abuja trunk routes any traveler will search first. Fares are in kobo
 * and are in the right band for 2026 — a seed that quotes ₦3,000 Lagos→Abuja
 * makes every downstream price-comparison screen look broken.
 *
 * Every password here is `Password123!`. This script refuses to run in production.
 */

const DAY_MS = 86_400_000;

/** Number of days of departures to generate ahead of today. */
const DEPARTURE_HORIZON_DAYS = 21;

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production.");
  }

  logger.info("Seeding…");

  // Order matters: children before parents. Restart identities so a re-seed
  // produces the same ids and the frontend's hardcoded dev links keep working.
  await db.execute(sql`
    truncate table
      ${s.walletTransactions}, ${s.wallets}, ${s.disputes}, ${s.tickets},
      ${s.payments}, ${s.bookings}, ${s.routeDepartures}, ${s.routes},
      ${s.reviews}, ${s.messages}, ${s.conversations}, ${s.operatorReps},
      ${s.operators}, ${s.notifications}, ${s.auditLogs}, ${s.refreshTokens},
      ${s.users}, ${s.cities}
    restart identity cascade
  `);

  const password = await hashPassword("Password123!");

  // ── Cities ─────────────────────────────────────────────────────────────────
  const cityRows = await db
    .insert(s.cities)
    .values(
      [
        ["Lagos", "Lagos"],
        ["Abuja", "FCT"],
        ["Port Harcourt", "Rivers"],
        ["Benin City", "Edo"],
        ["Ibadan", "Oyo"],
        ["Enugu", "Enugu"],
        ["Onitsha", "Anambra"],
        ["Warri", "Delta"],
        ["Asaba", "Delta"],
        ["Owerri", "Imo"],
        ["Uyo", "Akwa Ibom"],
        ["Calabar", "Cross River"],
        ["Kano", "Kano"],
        ["Jos", "Plateau"],
      ].map(([name, state]) => ({
        name: name!,
        state: state!,
        slug: slugify(`${name}-${state}`),
      })),
    )
    .returning();

  const city = (name: string): number => {
    const found = cityRows.find((c) => c.name === name);
    if (!found) throw new Error(`Seed error: unknown city ${name}`);
    return found.id;
  };

  // ── Users ──────────────────────────────────────────────────────────────────
  const [admin] = await db
    .insert(s.users)
    .values({
      name: "ArriveLink Admin",
      email: "admin@arrivelink.ng",
      phone: "+2348000000001",
      passwordHash: password,
      role: "admin",
      emailVerifiedAt: new Date(),
    })
    .returning();

  const travelers = await db
    .insert(s.users)
    .values([
      {
        name: "Ada Okafor",
        email: "ada@example.com",
        phone: "+2348012345678",
        passwordHash: password,
        role: "traveler" as const,
        emailVerifiedAt: new Date(),
      },
      {
        name: "Tunde Bakare",
        email: "tunde@example.com",
        phone: "+2348023456789",
        passwordHash: password,
        role: "traveler" as const,
        emailVerifiedAt: new Date(),
      },
      {
        name: "Chioma Eze",
        email: "chioma@example.com",
        phone: "+2348034567890",
        passwordHash: password,
        role: "traveler" as const,
      },
    ])
    .returning();

  // ── Operators ──────────────────────────────────────────────────────────────
  const operatorSeed = [
    {
      businessName: "GUO Transport",
      tagline: "Your journey, our priority",
      about:
        "One of Nigeria's largest interstate operators, running daily departures from Jibowu and terminals in 22 states.",
      foundedYear: 1980,
      fleetSize: 500,
      isVerified: true,
      featured: true,
      rating: "4.20",
      reviewCount: 128,
      responseRate: "0.920",
      rep: { name: "Emeka Nwosu", email: "rep@guotransport.ng", phone: "+2348012345678" },
    },
    {
      businessName: "ABC Transport",
      tagline: "Comfortable rides across Nigeria",
      about:
        "Premium interstate coach service with assigned seating, onboard refreshments and a punctuality guarantee.",
      foundedYear: 1993,
      fleetSize: 220,
      isVerified: true,
      featured: true,
      rating: "4.50",
      reviewCount: 89,
      responseRate: "0.880",
      rep: { name: "Funmi Adeyemi", email: "rep@abctransport.ng", phone: "+2348098765432" },
    },
    {
      businessName: "Peace Mass Transit",
      tagline: "Safe and affordable travel",
      about:
        "Wide network across the South-East and North-Central, known for frequent departures on the Enugu corridor.",
      foundedYear: 1995,
      fleetSize: 800,
      isVerified: true,
      featured: false,
      rating: "3.90",
      reviewCount: 214,
      responseRate: "0.760",
      rep: { name: "Ifeanyi Okeke", email: "rep@peacemass.ng", phone: "+2348055512345" },
    },
    {
      businessName: "God is Good Motors",
      tagline: "Travel in comfort and safety",
      about:
        "Benin City-headquartered operator with tracked fleet, online manifests and a strong South-South presence.",
      foundedYear: 1998,
      fleetSize: 300,
      isVerified: true,
      featured: false,
      rating: "4.40",
      reviewCount: 156,
      responseRate: "0.940",
      rep: { name: "Osaze Igbinedion", email: "rep@gigm.ng", phone: "+2348066612345" },
    },
    {
      businessName: "Chisco Transport",
      tagline: "The people's choice",
      about:
        "Long-standing operator on the Lagos–East corridor with terminals in Lagos, Onitsha, Aba and Port Harcourt.",
      foundedYear: 1979,
      fleetSize: 260,
      isVerified: false,
      featured: false,
      rating: "3.70",
      reviewCount: 61,
      responseRate: "0.640",
      rep: { name: "Chidi Anyanwu", email: "rep@chisco.ng", phone: "+2348077712345" },
    },
  ];

  const operatorRows = await db
    .insert(s.operators)
    .values(
      operatorSeed.map((o) => ({
        businessName: o.businessName,
        slug: slugify(o.businessName),
        tagline: o.tagline,
        about: o.about,
        foundedYear: o.foundedYear,
        fleetSize: o.fleetSize,
        isVerified: o.isVerified,
        featured: o.featured,
        rating: o.rating,
        reviewCount: o.reviewCount,
        responseRate: o.responseRate,
        status: "active" as const,
      })),
    )
    .returning();

  const operatorId = (name: string): number => {
    const found = operatorRows.find((o) => o.businessName === name);
    if (!found) throw new Error(`Seed error: unknown operator ${name}`);
    return found.id;
  };

  // Each operator gets a wallet and a rep user.
  await db
    .insert(s.wallets)
    .values(operatorRows.map((o) => ({ operatorId: o.id })));

  const repUsers = await db
    .insert(s.users)
    .values(
      operatorSeed.map((o) => ({
        name: o.rep.name,
        email: o.rep.email,
        phone: o.rep.phone,
        passwordHash: password,
        role: "operator_rep" as const,
        emailVerifiedAt: new Date(),
      })),
    )
    .returning();

  await db.insert(s.operatorReps).values(
    operatorSeed.map((o, i) => ({
      operatorId: operatorId(o.businessName),
      userId: repUsers[i]!.id,
      phone: o.rep.phone,
      whatsapp: o.rep.phone,
      email: o.rep.email,
    })),
  );

  // ── Routes ─────────────────────────────────────────────────────────────────
  // [operator, origin, destination, fare(kobo), times, terminal, hours, verified]
  const routeSeed: Array<
    [string, string, string, number, string[], string, number, boolean]
  > = [
    ["GUO Transport", "Lagos", "Abuja", 4_500_000, ["06:00", "09:00", "14:00"], "Jibowu Terminal", 600, true],
    ["GUO Transport", "Lagos", "Benin City", 2_200_000, ["06:30", "10:00", "16:00"], "Jibowu Terminal", 300, true],
    ["GUO Transport", "Lagos", "Port Harcourt", 3_800_000, ["06:00", "18:00"], "Jibowu Terminal", 540, true],
    ["ABC Transport", "Lagos", "Abuja", 5_200_000, ["07:00", "12:00", "21:00"], "Amuwo Odofin Terminal", 570, true],
    ["ABC Transport", "Lagos", "Owerri", 3_400_000, ["06:00", "19:00"], "Amuwo Odofin Terminal", 480, true],
    ["ABC Transport", "Abuja", "Lagos", 5_200_000, ["07:00", "20:00"], "Utako Terminal", 570, true],
    ["Peace Mass Transit", "Abuja", "Enugu", 2_800_000, ["06:00", "08:00", "15:00"], "Utako Terminal", 420, false],
    ["Peace Mass Transit", "Enugu", "Lagos", 3_600_000, ["05:30", "07:00"], "Holy Ghost Terminal", 510, false],
    ["Peace Mass Transit", "Onitsha", "Abuja", 3_000_000, ["06:00", "13:00"], "Upper Iweka Park", 450, false],
    ["God is Good Motors", "Benin City", "Lagos", 2_300_000, ["06:00", "08:00", "13:00", "17:00"], "Sapele Road Terminal", 300, true],
    ["God is Good Motors", "Benin City", "Abuja", 3_900_000, ["06:30", "09:00"], "Sapele Road Terminal", 480, true],
    ["God is Good Motors", "Benin City", "Port Harcourt", 2_600_000, ["07:00", "14:00"], "Sapele Road Terminal", 330, true],
    ["God is Good Motors", "Warri", "Lagos", 2_500_000, ["06:00", "12:00"], "Effurun Terminal", 330, true],
    ["Chisco Transport", "Lagos", "Onitsha", 2_900_000, ["05:30", "11:00"], "Iyana Ipaja Park", 450, false],
    ["Chisco Transport", "Lagos", "Uyo", 4_100_000, ["06:00"], "Iyana Ipaja Park", 600, false],
  ];

  const routeRows = await db
    .insert(s.routes)
    .values(
      routeSeed.map(([op, from, to, fare, _times, terminal, mins, verified]) => ({
        operatorId: operatorId(op),
        originCityId: city(from),
        destinationCityId: city(to),
        fare,
        priceType: verified ? ("verified" as const) : ("last_seen" as const),
        priceVerifiedDate: isoDate(verified ? -3 : -28),
        seatsTotal: 14,
        terminalLocation: terminal,
        durationMinutes: mins,
      })),
    )
    .returning();

  // ── Departures ─────────────────────────────────────────────────────────────
  // One row per (route, date, time) across the booking horizon. This is the
  // inventory bookings actually consume.
  const departureValues: (typeof s.routeDepartures.$inferInsert)[] = [];

  routeRows.forEach((route, index) => {
    const times = routeSeed[index]![4];
    for (let day = 0; day < DEPARTURE_HORIZON_DAYS; day += 1) {
      for (const time of times) {
        // Vary remaining seats so the results screen shows a realistic mix of
        // "3 seats left" urgency and freshly opened departures.
        const sold = day === 0 ? 6 + (index % 5) : Math.max(0, 4 - day) + (index % 3);
        const seatsAvailable = Math.max(0, route.seatsTotal - sold);
        departureValues.push({
          routeId: route.id,
          departureDate: isoDate(day),
          departureTime: `${time}:00`,
          seatsTotal: route.seatsTotal,
          seatsAvailable,
          status: seatsAvailable === 0 ? "full" : "available",
        });
      }
    }
  });

  await db.insert(s.routeDepartures).values(departureValues);
  logger.info({ count: departureValues.length }, "Departures generated");

  // ── Reviews ────────────────────────────────────────────────────────────────
  await db.insert(s.reviews).values([
    {
      operatorId: operatorId("GUO Transport"),
      authorId: travelers[0]!.id,
      authorName: "Ada O.",
      ratingPunctuality: 4,
      ratingComfort: 4,
      ratingSafety: 5,
      ratingValue: 4,
      ratingProfessionalism: 4,
      reviewText: "Bus left Jibowu almost on time and the driver was steady. Would book again.",
    },
    {
      operatorId: operatorId("ABC Transport"),
      authorId: travelers[1]!.id,
      authorName: "Tunde B.",
      ratingPunctuality: 5,
      ratingComfort: 5,
      ratingSafety: 5,
      ratingValue: 4,
      ratingProfessionalism: 5,
      reviewText: "Cleanest coach I have taken on this route. Left exactly at 07:00.",
    },
    {
      operatorId: operatorId("God is Good Motors"),
      authorId: travelers[2]!.id,
      authorName: "Chioma E.",
      ratingPunctuality: 5,
      ratingComfort: 4,
      ratingSafety: 5,
      ratingValue: 4,
      ratingProfessionalism: 5,
      reviewText: "Benin to Lagos was smooth, and the rep confirmed my seat in under five minutes.",
    },
    {
      operatorId: operatorId("Peace Mass Transit"),
      authorName: "Ngozi A.",
      ratingPunctuality: 3,
      ratingComfort: 3,
      ratingSafety: 4,
      ratingValue: 5,
      ratingProfessionalism: 3,
      reviewText: "Cheapest option on the Enugu run, but we waited an hour to fill up.",
    },
  ]);

  // ── A worked booking, mid-flow ─────────────────────────────────────────────
  // Gives the operator dashboard a live request to act on, with a real deadline
  // ticking, so the 10-minute countdown is visible immediately after seeding.
  const [pendingDeparture] = await db
    .select()
    .from(s.routeDepartures)
    .where(sql`${s.routeDepartures.seatsAvailable} > 2`)
    .limit(1);

  if (pendingDeparture) {
    const route = routeRows.find((r) => r.id === pendingDeparture.routeId)!;
    await db.insert(s.bookings).values({
      reference: generateBookingReference(),
      departureId: pendingDeparture.id,
      travelerId: travelers[0]!.id,
      travelerName: travelers[0]!.name,
      travelerPhone: travelers[0]!.phone ?? "+2348012345678",
      travelerEmail: travelers[0]!.email,
      seatsRequested: 2,
      farePerSeat: route.fare,
      status: "AWAITING_RESPONSE",
      requestedAt: new Date(Date.now() - 2 * 60_000),
      responseDeadline: new Date(Date.now() + 8 * 60_000),
    });
  }

  await db.insert(s.auditLogs).values({
    actorId: admin!.id,
    actorLabel: "ArriveLink Admin",
    action: "database.seeded",
    entityType: "system",
    metadata: {
      cities: cityRows.length,
      operators: operatorRows.length,
      routes: routeRows.length,
      departures: departureValues.length,
    },
  });

  logger.info(
    {
      cities: cityRows.length,
      operators: operatorRows.length,
      routes: routeRows.length,
      departures: departureValues.length,
      users: 1 + travelers.length + repUsers.length,
    },
    "Seed complete. All accounts use the password: Password123!",
  );
}

main()
  .then(async () => {
    await closeConnection();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ err }, "Seed failed");
    await closeConnection().catch(() => undefined);
    process.exit(1);
  });
