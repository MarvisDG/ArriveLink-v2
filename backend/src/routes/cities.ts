import { Router, type IRouter } from "express";
import { listCities } from "../infrastructure/db/repositories/catalog-repository";
import { asyncHandler } from "../middleware/error-handler";

const router: IRouter = Router();

router.get(
  "/cities",
  asyncHandler(async (_req, res) => {
    res.json(await listCities());
  }),
);

export default router;
