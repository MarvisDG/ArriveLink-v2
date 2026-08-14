import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  findRouteDetail,
  platformStats,
  popularRoutes,
  searchRoutes,
  upcomingDeparturesForRoute,
} from "../infrastructure/db/repositories/catalog-repository";
import { asyncHandler } from "../middleware/error-handler";
import { NotFoundError } from "../domain/shared/errors";

const router: IRouter = Router();

const searchQuerySchema = z.object({
  from_city_id: z.coerce.number().int().positive("from_city_id is required"),
  to_city_id: z.coerce.number().int().positive("to_city_id is required"),
});

// Declared before "/routes/:id/departures" so the literal path is not captured
// by the parameterised one.
router.get(
  "/routes/popular",
  asyncHandler(async (_req, res) => {
    res.json(await popularRoutes());
  }),
);

router.get(
  "/routes/search",
  asyncHandler(async (req, res) => {
    const { from_city_id, to_city_id } = searchQuerySchema.parse(req.query);
    res.json(await searchRoutes(from_city_id, to_city_id));
  }),
);

/**
 * The concrete departures behind a route's `departure_times`. The booking flow
 * needs the departure id and its remaining seats, not just the time label.
 */
router.get(
  "/routes/:id/departures",
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    res.json(await upcomingDeparturesForRoute(id));
  }),
);

router.get(
  "/routes/:id",
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const route = await findRouteDetail(id);
    if (!route) throw new NotFoundError("Route", id);
    res.json(route);
  }),
);

router.get(
  "/stats/platform",
  asyncHandler(async (_req, res) => {
    res.json(await platformStats());
  }),
);

export default router;
