import type { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyAccessToken, type AccessTokenClaims } from "../infrastructure/auth/tokens";
import {
  ForbiddenError,
  UnauthenticatedError,
} from "../domain/shared/errors";

/**
 * Authentication middleware.
 *
 * `authenticate` rejects; `optionalAuth` populates when a token is present and
 * carries on when it is not. Both are needed: browsing routes and starting an
 * enquiry are open to guests (PRD §3), while a booking is not.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
    }
  }
}

function bearerFrom(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = bearerFrom(req);
    if (!token) throw new UnauthenticatedError("Authorization header missing");
    req.auth = await verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = bearerFrom(req);
  if (!token) return next();
  try {
    req.auth = await verifyAccessToken(token);
  } catch {
    // A bad token on an optional route is treated as no token rather than an
    // error — an expired session should not break public browsing.
  }
  next();
};

/** Route guard: the caller must hold one of `roles`. Use after `authenticate`. */
export function requireRole(
  ...roles: AccessTokenClaims["role"][]
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(new UnauthenticatedError());
    if (!roles.includes(req.auth.role)) {
      return next(
        new ForbiddenError(
          `This action requires the ${roles.join(" or ")} role`,
        ),
      );
    }
    next();
  };
}

/**
 * An operator rep whose token carries no operatorId is a rep record that was
 * deleted after the token was issued. Fail closed rather than letting the
 * request through with an undefined scope.
 */
export function requireOperator(req: Request): number {
  if (!req.auth) throw new UnauthenticatedError();
  if (req.auth.role !== "operator_rep" || req.auth.operatorId === undefined) {
    throw new ForbiddenError("This action requires an operator account");
  }
  return req.auth.operatorId;
}
