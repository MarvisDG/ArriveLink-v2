import app from "./app";
import { logger } from "./lib/logger";
import { env } from "./config/env";
import { closeConnection, verifyConnection } from "./infrastructure/db/client";
import { sweepExpiredBookings } from "./application/booking/booking-service";

/**
 * Boot order matters: verify Postgres before binding the port.
 *
 * A server that accepts connections it cannot serve looks healthy to a load
 * balancer and fails every request. Failing to start is the louder, better
 * signal.
 */
async function main(): Promise<void> {
  await verifyConnection();
  logger.info("Database connection verified");

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server listening");
  });

  /**
   * The timeout sweeper (PRD §5): reservations nobody answered inside the
   * response window, and confirmed bookings nobody paid for inside the payment
   * window, are cancelled and their seats returned.
   *
   * On an interval rather than lazily on read — seats held by an abandoned
   * booking must come back whether or not anyone happens to query that
   * departure. `unref` so the timer never keeps the process alive on shutdown.
   */
  const sweeper = setInterval(() => {
    void sweepExpiredBookings().catch((err) => {
      logger.error({ err }, "Booking sweep failed");
    });
  }, env.SWEEPER_INTERVAL_SECONDS * 1000);
  sweeper.unref();

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Shutting down");
    clearInterval(sweeper);
    // Stop accepting new connections, let in-flight requests finish, then drop
    // the pool. Closing the pool first would fail those in-flight requests.
    server.close(() => {
      void closeConnection()
        .catch((err) => logger.error({ err }, "Error closing pool"))
        .finally(() => process.exit(0));
    });

    // A request that never completes must not block the deploy indefinitely.
    setTimeout(() => {
      logger.warn("Forcing shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
