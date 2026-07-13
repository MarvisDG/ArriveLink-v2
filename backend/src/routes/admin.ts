import { Router, type IRouter } from "express";
import {
  checkAdminSecret,
  getAdminStats,
  getAdminUsers,
  deleteUser,
  getAdminCompanies,
  updateCompanyInviteCode,
  updateCompanyFlags,
  getAdminOperators,
  deleteOperator,
} from "../lib/mock-db";


const router: IRouter = Router();

function requireAdmin(req: { headers: { [key: string]: string | string[] | undefined } }) {
  const secret = (req.headers["x-admin-secret"] as string) ?? "";
  return checkAdminSecret(secret);
}

router.get("/admin/stats", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(getAdminStats());
});

router.get("/admin/users", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(getAdminUsers());
});

router.delete("/admin/users/:id", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id ?? "", 10);
    deleteUser(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to delete" });
  }
});

router.get("/admin/companies", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(getAdminCompanies());
});

router.put("/admin/companies/:id/invite-code", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id ?? "", 10);
    updateCompanyInviteCode(id, req.body.invite_code);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update" });
  }
});

router.put("/admin/companies/:id/verify", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id ?? "", 10);
    updateCompanyFlags(id, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to update" });
  }
});

router.get("/admin/operators", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(getAdminOperators());
});

router.delete("/admin/operators/:id", (req, res) => {
  if (!requireAdmin(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const id = parseInt(req.params.id ?? "", 10);
    deleteOperator(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to delete" });
  }
});

export default router;
