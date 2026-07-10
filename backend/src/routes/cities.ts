import { Router, type IRouter } from "express";
import { getCities } from "../lib/mock-db";

const router: IRouter = Router();

router.get("/cities", (_req, res) => {
  res.json(getCities());
});

export default router;
