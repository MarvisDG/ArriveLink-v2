import { Router, type IRouter } from "express";
import { searchRoutes, getPopularRoutes, getPlatformStats } from "../lib/mock-db";

const router: IRouter = Router();

router.get("/routes/popular", (_req, res) => {
  res.json(getPopularRoutes());
});

router.get("/routes/search", (req, res) => {
  const fromCityId = parseInt(req.query.from_city_id as string ?? "", 10);
  const toCityId = parseInt(req.query.to_city_id as string ?? "", 10);

  if (!fromCityId || !toCityId) {
    res.status(400).json({ error: "from_city_id and to_city_id are required" });
    return;
  }

  res.json(searchRoutes(fromCityId, toCityId));
});

router.get("/stats/platform", (_req, res) => {
  res.json(getPlatformStats());
});

export default router;
