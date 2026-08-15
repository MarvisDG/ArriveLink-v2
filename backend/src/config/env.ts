import { z } from "zod";

/**
 * Environment is parsed once, at boot, and fails loudly.
 *
 * The alternative — reading process.env at each call site — means a missing
 * JWT secret surfaces as a 500 on the first login attempt in production rather
 * than as a container that refuses to start.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  /** Postgres. Identical shape for local Docker and Neon. */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  /**
   * Secrets must be long enough that a brute-force against a signed token is
   * not the cheapest attack available.
   */
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be ≥ 16 chars"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be ≥ 16 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  /**
   * Shared-secret fallback for the admin console, which predates the admin
   * role. No default on purpose: unset means the header is rejected outright,
   * so a deployment cannot inherit a guessable secret by forgetting to set one.
   * The real path is a JWT with role = 'admin'.
   */
  ADMIN_SECRET: z.string().min(16).optional(),

  // ── Booking windows (PRD §5) ───────────────────────────────────────────────
  /** Rep has this long to accept or reject. PRD says 10 minutes. */
  RESPONSE_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  /** Traveler has this long to pay. PRD says 20–30; 25 is the midpoint. */
  PAYMENT_WINDOW_MINUTES: z.coerce.number().int().positive().default(25),
  /** How long paid funds sit in pending before becoming withdrawable. */
  SETTLEMENT_WINDOW_HOURS: z.coerce.number().int().positive().default(24),
  /** How often the timeout sweeper runs. */
  SWEEPER_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),

  /** PRD §8 — fixed ₦200, in kobo. */
  CONVENIENCE_FEE_KOBO: z.coerce.number().int().nonnegative().default(20_000),

  // ── Third parties. Optional so the stack boots without them. ───────────────
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("ArriveLink <no-reply@arrivelink.ng>"),

  APP_URL: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Paystack is required to take money. In development the stack should still
 * boot without it, so payment routes degrade rather than the process dying.
 */
export const isPaystackConfigured = Boolean(env.PAYSTACK_SECRET_KEY);
export const isEmailConfigured = Boolean(env.RESEND_API_KEY);
