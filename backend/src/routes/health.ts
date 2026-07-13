// import { Router, type IRouter } from "express";
// import { HealthCheckResponse } from "../lib/api-zod";
import { Router, type IRouter } from "express";


const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  // const data = HealthCheckResponse.parse({ status: "ok" });
  // res.json(data);
  res.json({ status: "ok" });

});

export default router;
