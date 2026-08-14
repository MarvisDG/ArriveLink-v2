import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { env, isProduction } from "../../config/env";
import { logger } from "../../lib/logger";

const { Pool, types } = pg;

/**
 * Postgres returns bigint and numeric as strings by default, because they can
 * exceed what a JS number holds. Every money column here is kobo stored as
 * bigint, and Nigerian fares are nowhere near 2^53 kobo (that is ₦90 trillion),
 * so parsing them to numbers is safe and saves a string→number conversion at
 * every call site.
 */
types.setTypeParser(types.builtins.INT8, (value) => Number(value));
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  /**
   * Neon terminates TLS with a certificate the default Node trust store does
   * not chain to a known root in every environment. Local Docker has no TLS at
   * all. Enabling it only when the URL asks for it keeps both working.
   */
  ssl: env.DATABASE_URL.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (err) => {
  // An idle client erroring is not fatal — the pool replaces it. Log and carry
  // on rather than letting an unhandled 'error' event take the process down.
  logger.error({ err }, "Unexpected error on idle Postgres client");
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, {
  schema,
  logger: !isProduction && env.LOG_LEVEL === "trace",
});

export type Database = typeof db;

/** A transaction handle. Repositories accept this so use cases can compose. */
export type DbTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

/** Either the pool or an open transaction — repositories accept both. */
export type DbExecutor = Database | DbTransaction;

export async function verifyConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("select 1");
  } finally {
    client.release();
  }
}

export async function closeConnection(): Promise<void> {
  await pool.end();
}

export { schema };
