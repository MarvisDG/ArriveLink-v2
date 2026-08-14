import { sql } from "drizzle-orm";
import { db, closeConnection } from "./client";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

/**
 * Drops and recreates the public schema. Development convenience only.
 *
 * Refuses to run against production, and refuses to run against a host that is
 * not obviously local unless ALLOW_REMOTE_RESET is set — the failure mode this
 * guards against is a developer with a Neon URL in their shell wiping the
 * shared database while trying to reset their laptop.
 */
async function main(): Promise<void> {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to reset the database in production.");
  }

  const isLocal =
    env.DATABASE_URL.includes("@localhost") ||
    env.DATABASE_URL.includes("@127.0.0.1") ||
    env.DATABASE_URL.includes("@postgres:");

  if (!isLocal && process.env.ALLOW_REMOTE_RESET !== "true") {
    throw new Error(
      "DATABASE_URL does not look local. Set ALLOW_REMOTE_RESET=true to override.",
    );
  }

  logger.warn("Dropping public schema…");
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
  logger.info("Schema reset. Run `npm run db:migrate` next.");
}

main()
  .then(async () => {
    await closeConnection();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ err }, "Reset failed");
    await closeConnection().catch(() => undefined);
    process.exit(1);
  });
