import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyAccessToken } from "../infrastructure/auth/tokens";
import { env } from "../config/env";
import { ForbiddenError, UnauthenticatedError } from "../domain/shared/errors";

/**
 * Admin authorisation, by either of two routes.
 *
 *   1. A JWT with role = 'admin'. This is the real mechanism: it identifies a
 *      person, so the audit log can name who acted.
 *   2. An `x-admin-secret` header matching ADMIN_SECRET. The console predates
 *      the admin role and still sends this. It is accepted only when
 *      ADMIN_SECRET is configured — unset means every such header is rejected,
 *      so a deployment cannot inherit a default secret by omission.
 *
 * A shared secret cannot say *who* acted, so requests authorised that way are
 * audited as "shared-secret" rather than as a named actor.
 */

function secretMatches(provided: string): boolean {
  const expected = env.ADMIN_SECRET;
  if (!expected) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length is compared separately because timingSafeEqual throws on a mismatch,
  // and a thrown error would itself be a timing signal.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const requireAdmin: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;
    const [scheme, token] = header?.split(" ") ?? [];

    if (token && scheme?.toLowerCase() === "bearer") {
      const claims = await verifyAccessToken(token);
      if (claims.role !== "admin") {
        throw new ForbiddenError("This action requires an admin account");
      }
      req.auth = claims;
      return next();
    }

    const provided = req.headers["x-admin-secret"];
    if (typeof provided === "string" && secretMatches(provided)) {
      return next();
    }

    throw new UnauthenticatedError("Admin credentials required");
  } catch (err) {
    next(err);
  }
};

/** Who to record in the audit log for this request. */
export function actorFor(req: Request): {
  actorId: number | null;
  actorLabel: string;
} {
  if (req.auth) {
    return { actorId: req.auth.userId, actorLabel: `user:${req.auth.userId}` };
  }
  return { actorId: null, actorLabel: "shared-secret" };
}
