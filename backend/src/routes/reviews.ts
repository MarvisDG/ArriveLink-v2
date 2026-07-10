import { Router, type IRouter } from "express";
import { submitReview } from "../lib/mock-db";

const router: IRouter = Router();

router.post("/reviews", (req, res) => {
  try {
    const review = submitReview(req.body);
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to submit review" });
  }
});

export default router;
