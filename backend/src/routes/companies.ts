import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  companyReviews,
  featuredCompanies,
  findCompany,
  listCompanies,
} from "../infrastructure/db/repositories/catalog-repository";
import { asyncHandler } from "../middleware/error-handler";
import { NotFoundError } from "../domain/shared/errors";

const router: IRouter = Router();

const idParam = z.coerce.number().int().positive();

router.get(
  "/companies",
  asyncHandler(async (_req, res) => {
    res.json(await listCompanies());
  }),
);

// Before "/companies/:id", or "featured" is parsed as an id.
router.get(
  "/companies/featured",
  asyncHandler(async (_req, res) => {
    res.json(await featuredCompanies());
  }),
);

router.get(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const company = await findCompany(id);
    if (!company) throw new NotFoundError("Company", id);
    res.json(company);
  }),
);

router.get(
  "/companies/:id/reviews",
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    res.json(await companyReviews(id));
  }),
);

export default router;
