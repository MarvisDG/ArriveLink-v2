/**
 * Schema barrel — every table, enum and relation in one namespace so the
 * Drizzle client can be constructed with full relational typing.
 *
 * Table ownership maps to PRD §6:
 *   users, operators, operator_reps, routes, bookings,
 *   payments, tickets, wallets, disputes
 *
 * Additions beyond PRD §6, each justified in its own file:
 *   cities              — normalised corridors, so operator comparison is valid
 *   route_departures    — per-departure seat inventory, required by the PRD §9
 *                         atomicity guarantee
 *   wallet_transactions — the ledger behind the cached wallet balances
 *   reviews             — the rating on the comparison screen
 *   conversations/messages — pre-booking traveler ↔ rep enquiries
 *   refresh_tokens      — hashed session store
 *   audit_logs          — PRD §2, admin "view audit logs"
 *   notifications       — PRD §7, as a transactional outbox
 */

export * from "./enums";
export * from "./cities";
export * from "./users";
export * from "./operators";
export * from "./operator-reps";
export * from "./routes";
export * from "./bookings";
export * from "./payments";
export * from "./tickets";
export * from "./wallets";
export * from "./disputes";
export * from "./reviews";
export * from "./messaging";
export * from "./auth";
export * from "./notifications";
