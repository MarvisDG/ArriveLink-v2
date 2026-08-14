import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  insertReview,
  operatorExists,
} from "../infrastructure/db/repositories/catalog-repository";
import { optionalAuth } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/error-handler";
import { NotFoundError } from "../domain/shared/errors";

const router: IRouter = Router();

const rating = z.coerce
  .number()
  .int()
  .min(1, "Ratings run from 1 to 5")
  .max(5, "Ratings run from 1 to 5");

/**
 * `traveler_email` and `route_id` are accepted because the published contract
 * lists them, but neither is persisted: the reviews table ties a review to a
 * booking, not to an email address or a route, so a trip can be reviewed once
 * by someone who actually took it. Accepting and ignoring keeps existing
 * clients working; storing them would mean columns nothing reads.
 */
const reviewSchema = z.object({
  traveler_name: z.string().trim().min(2).max(120),
  traveler_email: z.string().trim().email().optional(),
  company_id: z.coerce.number().int().positive(),
  route_id: z.coerce.number().int().positive().nullish(),
  booking_id: z.coerce.number().int().positive().nullish(),
  rating_punctuality: rating,
  rating_comfort: rating,
  rating_safety: rating,
  rating_value: rating,
  rating_professionalism: rating,
  review_text: z.string().trim().max(2000).nullish(),
});

router.post(
  "/reviews",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = reviewSchema.parse(req.body);

    if (!(await operatorExists(input.company_id))) {
      throw new NotFoundError("Company", input.company_id);
    }

    const review = await insertReview({
      operatorId: input.company_id,
      authorName: input.traveler_name,
      // Attributed to the signed-in user when there is one, so a review can be
      // traced back; anonymous submissions still carry the display name.
      authorId: req.auth?.userId ?? null,
      bookingId: input.booking_id ?? null,
      ratingPunctuality: input.rating_punctuality,
      ratingComfort: input.rating_comfort,
      ratingSafety: input.rating_safety,
      ratingValue: input.rating_value,
      ratingProfessionalism: input.rating_professionalism,
      reviewText: input.review_text ?? null,
    });

    res.status(201).json({
      id: review.id,
      traveler_name: review.authorName,
      review_text: review.reviewText,
      created_at: review.createdAt.toISOString(),
      rating_punctuality: review.ratingPunctuality,
      rating_comfort: review.ratingComfort,
      rating_safety: review.ratingSafety,
      rating_value: review.ratingValue,
      rating_professionalism: review.ratingProfessionalism,
    });
  }),
);

export default router;
