import { Router, type IRouter } from "express";
import {
  getCompanyList,
  getFeaturedCompanies,
  getCompany,
  getCompanyReviews,
} from "../lib/mock-db";

const router: IRouter = Router();

router.get("/companies", (_req, res) => {
  res.json(getCompanyList());
});

router.get("/companies/featured", (_req, res) => {
  res.json(getFeaturedCompanies());
});

router.get("/companies/:id", (req, res) => {
  const id = parseInt(req.params.id ?? "", 10);
  const company = getCompany(id);
  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }
  res.json(company);
});

router.get("/companies/:id/reviews", (req, res) => {
  const id = parseInt(req.params.id ?? "", 10);
  res.json(getCompanyReviews(id));
});

export default router;
