import { z } from "zod";
import { db } from "../../infrastructure/db/client";
import {
  hashPassword,
  needsRehash,
  verifyPassword,
} from "../../infrastructure/auth/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  type TokenRole,
} from "../../infrastructure/auth/tokens";
import * as repo from "../../infrastructure/db/repositories/user-repository";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
} from "../../domain/shared/errors";

/**
 * Authentication use cases.
 *
 * The HTTP layer does no auth logic beyond parsing the request and choosing a
 * status code — everything that decides whether a credential is good lives here.
 */

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+?234|0)[789]\d{9}$/,
      "Enter a valid Nigerian phone number, e.g. 08012345678",
    )
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password must be at most 200 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export interface SessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  userId: number;
  name: string;
  role: TokenRole;
  operatorId?: number;
}

/**
 * Mint an access token and persist a fresh refresh token.
 * Shared by register, login and refresh so the session shape can never drift
 * between the three paths.
 */
async function issueSession(
  user: { id: number; name: string; role: TokenRole },
  ctx: SessionContext,
  exec = db,
): Promise<IssuedSession> {
  const operator =
    user.role === "operator_rep"
      ? await repo.findOperatorForUser(user.id, exec)
      : undefined;

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    ...(operator ? { operatorId: operator.operatorId } : {}),
  });

  const refreshToken = generateRefreshToken();
  await repo.storeRefreshToken(
    {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiry(),
      userAgent: ctx.userAgent ?? null,
      ipAddress: ctx.ipAddress ?? null,
    },
    exec,
  );

  return {
    accessToken,
    refreshToken,
    userId: user.id,
    name: user.name,
    role: user.role,
    ...(operator ? { operatorId: operator.operatorId } : {}),
  };
}

export async function registerTraveler(
  input: z.infer<typeof registerSchema>,
  ctx: SessionContext = {},
): Promise<IssuedSession> {
  const existing = await repo.findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError(
      "EMAIL_ALREADY_REGISTERED",
      "That email is already registered. Try signing in instead.",
    );
  }

  const passwordHash = await hashPassword(input.password);

  // Registering the user and storing their first session are one unit: a user
  // row with no session would leave the caller authenticated-but-tokenless.
  return db.transaction(async (tx) => {
    const user = await repo.insertUser(
      {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        role: "traveler",
      },
      tx,
    );
    return issueSession(
      { id: user.id, name: user.name, role: user.role },
      ctx,
      tx as unknown as typeof db,
    );
  });
}

export async function login(
  input: z.infer<typeof loginSchema>,
  ctx: SessionContext = {},
): Promise<IssuedSession> {
  const user = await repo.findUserByEmail(input.email);

  /**
   * A missing user and a wrong password return the same error, and the hash is
   * still computed when the user does not exist. Skipping the hash would make
   * "no such account" measurably faster and turn login into an account
   * enumeration oracle.
   */
  const storedHash =
    user?.passwordHash ??
    "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  const ok = await verifyPassword(input.password, storedHash);
  if (!user || !ok) {
    throw new UnauthenticatedError("Incorrect email or password");
  }

  // Transparent upgrade: the parameters travel with the hash, so raising them
  // re-hashes each user once, on their next successful login.
  if (needsRehash(user.passwordHash)) {
    const upgraded = await hashPassword(input.password);
    await repo.updateUser(user.id, { passwordHash: upgraded });
  }

  await repo.touchLastLogin(user.id);
  return issueSession(
    { id: user.id, name: user.name, role: user.role },
    ctx,
  );
}

/** Operator reps sign in through the same credential store, then are role-gated. */
export async function operatorLogin(
  input: z.infer<typeof loginSchema>,
  ctx: SessionContext = {},
): Promise<IssuedSession & { operatorId: number }> {
  const session = await login(input, ctx);

  if (session.role !== "operator_rep" || session.operatorId === undefined) {
    throw new ForbiddenError(
      "This account is not registered as an operator representative.",
    );
  }

  return session as IssuedSession & { operatorId: number };
}

/**
 * Rotate a refresh token.
 *
 * Presenting an already-rotated token is treated as theft: we cannot tell the
 * thief from the legitimate holder, so every session for that user is revoked.
 */
export async function refreshSession(
  presentedToken: string,
  ctx: SessionContext = {},
): Promise<IssuedSession> {
  const tokenHash = hashRefreshToken(presentedToken);

  return db.transaction(async (tx) => {
    const exec = tx as unknown as typeof db;
    const record = await repo.findLiveRefreshToken(tokenHash, exec);
    if (!record) throw new UnauthenticatedError("Invalid refresh token");

    if (record.replacedById !== null) {
      await repo.revokeAllUserTokens(record.userId, exec);
      throw new UnauthenticatedError(
        "This session was already refreshed. All sessions have been signed out.",
      );
    }

    const usable = await repo.isRefreshTokenUsable(tokenHash, exec);
    if (!usable) throw new UnauthenticatedError("Refresh token expired");

    const user = await repo.findUserById(record.userId, exec);
    if (!user) throw new UnauthenticatedError("Account no longer exists");

    const session = await issueSession(
      { id: user.id, name: user.name, role: user.role },
      ctx,
      exec,
    );

    const replacement = await repo.findLiveRefreshToken(
      hashRefreshToken(session.refreshToken),
      exec,
    );
    await repo.revokeRefreshToken(record.id, replacement?.id ?? null, exec);

    return session;
  });
}

export async function logout(presentedToken: string): Promise<void> {
  const record = await repo.findLiveRefreshToken(
    hashRefreshToken(presentedToken),
  );
  // Logging out with an unknown token is not an error — the desired end state
  // (that token cannot be used) already holds.
  if (record) await repo.revokeRefreshToken(record.id, null, db);
}

export async function logoutEverywhere(userId: number): Promise<void> {
  await repo.revokeAllUserTokens(userId);
}

/** The `/users/me` payload, in the snake_case shape the OpenAPI contract fixes. */
export async function getProfile(userId: number): Promise<{
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}> {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError("User", userId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    created_at: user.createdAt.toISOString(),
  };
}
