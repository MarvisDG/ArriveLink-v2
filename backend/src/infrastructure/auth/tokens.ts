import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "../../config/env";
import { UnauthenticatedError } from "../../domain/shared/errors";

/**
 * Token issuing and verification.
 *
 * Two token types, deliberately asymmetric:
 *
 *   access  — a short-lived signed JWT. Stateless: no database read on the hot
 *             path, which is the whole point. The cost of statelessness is that
 *             it cannot be revoked, so it expires in minutes.
 *   refresh — a long-lived opaque random string. Stateful: only its SHA-256
 *             hash is stored (see schema/auth.ts), so it *can* be revoked, and
 *             a stolen database dump cannot be replayed as a session.
 *
 * Signing both with the same secret would mean a leaked access token is also a
 * valid refresh token, so the two secrets are separate and non-interchangeable.
 */

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

const ISSUER = "arrivelink";
const AUDIENCE = "arrivelink-api";

export type TokenRole = "traveler" | "operator_rep" | "admin";

export interface AccessTokenClaims {
  /** users.id */
  userId: number;
  role: TokenRole;
  /**
   * operators.id, present only for an operator_rep. Carried in the token so the
   * common "does this rep own this route/booking?" check needs no extra join on
   * every request. A rep's operator does not change without re-issuing anyway.
   */
  operatorId?: number;
}

interface AccessTokenPayload extends JWTPayload {
  role: TokenRole;
  operatorId?: number;
}

export async function signAccessToken(
  claims: AccessTokenClaims,
): Promise<string> {
  const builder = new SignJWT({
    role: claims.role,
    ...(claims.operatorId !== undefined
      ? { operatorId: claims.operatorId }
      : {}),
  } satisfies AccessTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(claims.userId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL);

  return builder.sign(ACCESS_SECRET);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify<AccessTokenPayload>(
      token,
      ACCESS_SECRET,
      {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ["HS256"],
      },
    );

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthenticatedError("Malformed token subject");
    }

    return {
      userId,
      role: payload.role,
      ...(payload.operatorId !== undefined
        ? { operatorId: payload.operatorId }
        : {}),
    };
  } catch (err) {
    if (err instanceof UnauthenticatedError) throw err;
    // jose distinguishes expiry from tampering, but the client gets one answer:
    // telling an attacker *why* a token failed is free information.
    throw new UnauthenticatedError("Invalid or expired token");
  }
}

// ── Refresh tokens ──────────────────────────────────────────────────────────

/**
 * 32 random bytes, base64url. Opaque — it carries no claims, so it cannot be
 * read or forged, only looked up.
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * SHA-256, not scrypt.
 *
 * Password hashing is deliberately slow because passwords are low-entropy and
 * guessable. A refresh token is 256 bits of CSPRNG output — there is nothing to
 * guess, so the slow KDF would buy no security and would add its cost to every
 * token refresh. SHA-256 is the right tool for hashing a high-entropy secret.
 */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare for two hex digests of equal length. */
export function refreshTokenMatches(token: string, storedHash: string): boolean {
  const computed = Buffer.from(hashRefreshToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}

export function refreshTokenExpiry(): Date {
  return new Date(
    Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
}
