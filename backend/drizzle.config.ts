import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env, or run `docker compose up postgres`.",
  );
}

export default defineConfig({
  schema: "./src/infrastructure/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Migration files are reviewed and committed, not pushed straight to the
  // database — the same SQL then runs against local Docker and Neon.
  verbose: true,
  strict: true,
});
