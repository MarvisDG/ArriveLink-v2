import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, closeConnection, verifyConnection } from "./client";
import { logger } from "../../lib/logger";

/**
 * Applies every pending migration in ./drizzle, in order.
 *
 * Run on deploy, and by `docker compose up` before the API starts serving.
 * Drizzle records applied migrations in `__drizzle_migrations`, so this is
 * safe to run repeatedly — re-running is a no-op, not a re-apply.
 */
async function main(): Promise<void> {
  logger.info("Verifying database connection…");
  await verifyConnection();

  logger.info("Applying migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });

  logger.info("Migrations applied.");
}

main()
  .then(async () => {
    await closeConnection();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ err }, "Migration failed");
    await closeConnection().catch(() => undefined);
    process.exit(1);
  });
