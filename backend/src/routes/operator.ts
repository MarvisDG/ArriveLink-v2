import { Router, type IRouter } from "express";
import {
  operatorLogin,
  operatorSignup,
  getOperatorFromToken,
  getOperatorProfile,
  updateOperatorCompany,
  getOperatorRoutes,
  addOperatorRoute,
  updateOperatorRoute,
  deleteOperatorRoute,
} from "../lib/mock-db";

const router: IRouter = Router();

function getBearerToken(req: { headers: { authorization?: string } }): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function requireOperator(req: Parameters<typeof getBearerToken>[0]) {
  const token = getBearerToken(req);
  const operator = getOperatorFromToken(token);
  return operator;
}

router.post("/operator/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    const result = operatorLogin(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : "Login failed" });
  }
});

router.post("/operator/auth/signup", (req, res) => {
  try {
    const result = operatorSignup(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Signup failed" });
  }
});

router.get("/operator/me", (req, res) => {
  const operator = requireOperator(req);
  if (!operator) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const profile = getOperatorProfile(operator.id);
  if (!profile) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(profile);
});

router.put("/operator/me/company", (req, res) => {
  const operator = requireOperator(req);
  if (!operator) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const result = updateOperatorCompany(operator.company_id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Update failed" });
  }
});

router.get("/operator/me/routes", (req, res) => {
  const operator = requireOperator(req);
  if (!operator) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(getOperatorRoutes(operator.company_id));
});

router.post("/operator/me/routes", (req, res) => {
  const operator = requireOperator(req);
  if (!operator) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const route = addOperatorRoute(operator.company_id, req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to add route" });
  }
});

router.put("/operator/me/routes/:id", (req, res) => {
  const operator = requireOperator(req);
  if (!operator) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id ?? "", 10);
    const route = updateOperatorRoute(id, operator.company_id, req.body);
    res.json(route);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update route" });
  }
});

router.delete("/operator/me/routes/:id", (req, res) => {
  const operator = requireOperator(req);
  if (!operator) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id ?? "", 10);
    deleteOperatorRoute(id, operator.company_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to delete route" });
  }
});

export default router;
