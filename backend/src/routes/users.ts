import { Router, type IRouter, type Request, type Response } from "express";
import {
  getProfile,
  login,
  loginSchema,
  logout,
  logoutEverywhere,
  refreshSession,
  registerSchema,
  registerTraveler,
  type IssuedSession,
  type SessionContext,
} from "../application/auth/auth-service";
import { authenticate } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/error-handler";
import { UnauthenticatedError } from "../domain/shared/errors";
import { isProduction } from "../config/env";

const router: IRouter = Router();

/**
 * The refresh token travels as an httpOnly cookie, never in the JSON body.
 *
 * The access token is short-lived and the client needs to read it to set the
 * Authorization header, so it goes in the response. The refresh token is
 * long-lived and the client never needs to read it — putting it out of
 * JavaScript's reach means an XSS bug cannot walk away with a 30-day session.
 */
const REFRESH_COOKIE = "arrivelink_refresh";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    // 'lax' still sends the cookie on the top-level navigation back from
    // Paystack, which 'strict' would drop.
    sameSite: "lax",
    path: "/api",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/api" });
}

function sessionContext(req: Request): SessionContext {
  return {
    userAgent: req.get("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  };
}

/** The response body the OpenAPI contract fixes: snake_case, access token only. */
function authBody(session: IssuedSession) {
  return {
    token: session.accessToken,
    user_id: session.userId,
    name: session.name,
  };
}

router.post(
  "/users/auth/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const session = await registerTraveler(input, sessionContext(req));
    setRefreshCookie(res, session.refreshToken);
    res.status(201).json(authBody(session));
  }),
);

router.post(
  "/users/auth/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const session = await login(input, sessionContext(req));
    setRefreshCookie(res, session.refreshToken);
    res.json(authBody(session));
  }),
);

router.post(
  "/users/auth/refresh",
  asyncHandler(async (req, res) => {
    const presented =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
      (typeof req.body?.refresh_token === "string"
        ? req.body.refresh_token
        : undefined);

    if (!presented) throw new UnauthenticatedError("No refresh token provided");

    const session = await refreshSession(presented, sessionContext(req));
    setRefreshCookie(res, session.refreshToken);
    res.json(authBody(session));
  }),
);

router.post(
  "/users/auth/logout",
  asyncHandler(async (req, res) => {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (presented) await logout(presented);
    clearRefreshCookie(res);
    res.json({ ok: true });
  }),
);

router.post(
  "/users/auth/logout-all",
  authenticate,
  asyncHandler(async (req, res) => {
    await logoutEverywhere(req.auth!.userId);
    clearRefreshCookie(res);
    res.json({ ok: true });
  }),
);

router.get(
  "/users/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getProfile(req.auth!.userId));
  }),
);

export default router;
