import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import {
  loginSchema,
  operatorLogin,
  operatorSignupSchema,
  registerOperatorRep,
} from "../application/auth/auth-service";
import { findCompany } from "../infrastructure/db/repositories/catalog-repository";
import * as operatorRepo from "../infrastructure/db/repositories/operator-repository";
import { authenticate, requireOperator } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/error-handler";
import { NotFoundError } from "../domain/shared/errors";
import { isProduction } from "../config/env";

const router: IRouter = Router();

const REFRESH_COOKIE = "arrivelink_refresh";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

const idParam = z.coerce.number().int().positive();

/** "06:00" or "06:00:00" — the timetable the operator types, not a timestamp. */
const departureTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use HH:MM, e.g. 06:30");

const routeInputSchema = z.object({
  departure_city_id: idParam,
  destination_city_id: idParam,
  /** Kobo. ₦15,000 is 1500000. */
  price: z.coerce.number().int().positive("Fare must be greater than zero"),
  price_type: z.enum(["verified", "last_seen"]).optional(),
  departure_times: z.array(departureTime).min(1, "Add at least one departure time"),
  terminal_location: z.string().trim().min(2).max(200),
  terminal_address: z.string().trim().max(400).nullish(),
  duration_minutes: z.coerce.number().int().positive().nullish(),
  seats_total: z.coerce.number().int().positive().max(100).optional(),
});

const routeUpdateSchema = z.object({
  price: z.coerce.number().int().positive().optional(),
  price_type: z.enum(["verified", "last_seen"]).optional(),
  departure_times: z.array(departureTime).optional(),
  terminal_location: z.string().trim().min(2).max(200).optional(),
  terminal_address: z.string().trim().max(400).nullish(),
  duration_minutes: z.coerce.number().int().positive().nullish(),
  is_active: z.boolean().optional(),
});

const companyUpdateSchema = z.object({
  tagline: z.string().trim().max(200).nullish(),
  about: z.string().trim().max(4000).nullish(),
  founded_year: z.coerce.number().int().min(1900).max(2100).nullish(),
  fleet_size: z.coerce.number().int().nonnegative().nullish(),
  rep_whatsapp: z.string().trim().max(40).nullish(),
  rep_phone: z.string().trim().max(40).nullish(),
});

// ── Auth ────────────────────────────────────────────────────────────────────

router.post(
  "/operator/auth/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const session = await operatorLogin(input, {
      userAgent: req.get("user-agent") ?? null,
      ipAddress: req.ip ?? null,
    });
    setRefreshCookie(res, session.refreshToken);
    res.json({ token: session.accessToken, operator_id: session.operatorId });
  }),
);

router.post(
  "/operator/auth/signup",
  asyncHandler(async (req, res) => {
    const input = operatorSignupSchema.parse(req.body);
    const session = await registerOperatorRep(input, {
      userAgent: req.get("user-agent") ?? null,
      ipAddress: req.ip ?? null,
    });
    setRefreshCookie(res, session.refreshToken);
    res
      .status(201)
      .json({ token: session.accessToken, operator_id: session.operatorId });
  }),
);

// ── Profile ─────────────────────────────────────────────────────────────────

/**
 * Every route below is scoped by `requireOperator`, which reads the operator id
 * from the verified token rather than from the request body — a rep cannot edit
 * another operator's routes by changing an id in the payload.
 */
router.get(
  "/operator/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const company = await findCompany(operatorId);
    if (!company) throw new NotFoundError("Company", operatorId);
    res.json({ company });
  }),
);

router.put(
  "/operator/me/company",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const input = companyUpdateSchema.parse(req.body);

    await operatorRepo.updateCompanyProfile(operatorId, {
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.about !== undefined ? { about: input.about } : {}),
      ...(input.founded_year !== undefined
        ? { foundedYear: input.founded_year }
        : {}),
      ...(input.fleet_size !== undefined ? { fleetSize: input.fleet_size } : {}),
    });

    // Contact details belong to the rep row, not the operator row.
    if (input.rep_phone !== undefined || input.rep_whatsapp !== undefined) {
      await operatorRepo.updateRepContact(req.auth!.userId, {
        ...(input.rep_phone !== undefined ? { phone: input.rep_phone } : {}),
        ...(input.rep_whatsapp !== undefined
          ? { whatsapp: input.rep_whatsapp }
          : {}),
      });
    }

    const company = await findCompany(operatorId);
    if (!company) throw new NotFoundError("Company", operatorId);
    res.json(company);
  }),
);

// ── Routes ──────────────────────────────────────────────────────────────────

router.get(
  "/operator/me/routes",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await operatorRepo.listOperatorRoutes(requireOperator(req)));
  }),
);

router.post(
  "/operator/me/routes",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const input = routeInputSchema.parse(req.body);

    const route = await operatorRepo.createRoute(operatorId, {
      originCityId: input.departure_city_id,
      destinationCityId: input.destination_city_id,
      fare: input.price,
      ...(input.price_type ? { priceType: input.price_type } : {}),
      departureTimes: input.departure_times,
      terminalLocation: input.terminal_location,
      terminalAddress: input.terminal_address ?? null,
      durationMinutes: input.duration_minutes ?? null,
      ...(input.seats_total ? { seatsTotal: input.seats_total } : {}),
    });

    const listed = await operatorRepo.listOperatorRoutes(operatorId);
    res.status(201).json(listed.find((r) => r.id === route.id) ?? route);
  }),
);

router.put(
  "/operator/me/routes/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const routeId = idParam.parse(req.params.id);
    const input = routeUpdateSchema.parse(req.body);

    const updated = await operatorRepo.updateRoute(routeId, operatorId, {
      ...(input.price !== undefined ? { fare: input.price } : {}),
      ...(input.price_type ? { priceType: input.price_type } : {}),
      ...(input.terminal_location
        ? { terminalLocation: input.terminal_location }
        : {}),
      ...(input.terminal_address !== undefined
        ? { terminalAddress: input.terminal_address }
        : {}),
      ...(input.duration_minutes !== undefined
        ? { durationMinutes: input.duration_minutes }
        : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
      ...(input.departure_times ? { departureTimes: input.departure_times } : {}),
    });

    // Undefined means no row matched *both* the id and the operator — either it
    // does not exist or it is someone else's. Same 404 for both, so the endpoint
    // cannot be used to probe for other operators' route ids.
    if (!updated) throw new NotFoundError("Route", routeId);

    const listed = await operatorRepo.listOperatorRoutes(operatorId);
    res.json(listed.find((r) => r.id === routeId) ?? updated);
  }),
);

router.delete(
  "/operator/me/routes/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const routeId = idParam.parse(req.params.id);
    const ok = await operatorRepo.deactivateRoute(routeId, operatorId);
    if (!ok) throw new NotFoundError("Route", routeId);
    res.json({ ok: true });
  }),
);

export default router;
