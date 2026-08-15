import { Router, type IRouter } from "express";
import { z } from "zod";
import * as repo from "../infrastructure/db/repositories/admin-repository";
import { setInviteCode } from "../infrastructure/db/repositories/operator-repository";
import { actorFor, requireAdmin } from "../middleware/require-admin";
import { asyncHandler } from "../middleware/error-handler";
import { NotFoundError } from "../domain/shared/errors";

const router: IRouter = Router();

const idParam = z.coerce.number().int().positive();

// Every admin route sits behind this; nothing below re-checks.
router.use("/admin", requireAdmin);

router.get(
  "/admin/stats",
  asyncHandler(async (_req, res) => {
    res.json(await repo.stats());
  }),
);

router.get(
  "/admin/users",
  asyncHandler(async (_req, res) => {
    res.json(await repo.listUsers());
  }),
);

router.delete(
  "/admin/users/:id",
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const deleted = await repo.deleteUser(id);
    if (!deleted) throw new NotFoundError("User", id);

    await repo.recordAudit({
      ...actorFor(req),
      action: "user.delete",
      entityType: "user",
      entityId: String(id),
      ipAddress: req.ip ?? null,
    });

    res.json({ ok: true });
  }),
);

router.get(
  "/admin/companies",
  asyncHandler(async (_req, res) => {
    res.json(await repo.listCompanies());
  }),
);

router.put(
  "/admin/companies/:id/invite-code",
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    // Empty string clears the code, which is how an operator stops accepting
    // new reps. Distinct from "field absent".
    const inviteCode = z
      .string()
      .trim()
      .max(64)
      .parse(req.body?.invite_code ?? "");

    const updated = await setInviteCode(id, inviteCode || null);
    if (!updated) throw new NotFoundError("Company", id);

    await repo.recordAudit({
      ...actorFor(req),
      action: "company.invite_code.update",
      entityType: "operator",
      entityId: String(id),
      // The code itself is a credential — record that it changed, not what to.
      metadata: { cleared: !inviteCode },
      ipAddress: req.ip ?? null,
    });

    res.json({ ok: true, id: updated.id });
  }),
);

router.put(
  "/admin/companies/:id/verify",
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const flags = z
      .object({
        is_verified: z.boolean().optional(),
        featured: z.boolean().optional(),
      })
      .parse(req.body ?? {});

    const updated = await repo.updateCompanyFlags(id, {
      ...(flags.is_verified !== undefined
        ? { isVerified: flags.is_verified }
        : {}),
      ...(flags.featured !== undefined ? { featured: flags.featured } : {}),
    });
    if (!updated) throw new NotFoundError("Company", id);

    await repo.recordAudit({
      ...actorFor(req),
      action: "company.flags.update",
      entityType: "operator",
      entityId: String(id),
      metadata: flags,
      ipAddress: req.ip ?? null,
    });

    res.json({ ok: true, ...updated });
  }),
);

router.get(
  "/admin/operators",
  asyncHandler(async (_req, res) => {
    res.json(await repo.listOperatorReps());
  }),
);

router.delete(
  "/admin/operators/:id",
  asyncHandler(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const deleted = await repo.deleteOperatorRep(id);
    if (!deleted) throw new NotFoundError("Operator rep", id);

    await repo.recordAudit({
      ...actorFor(req),
      action: "operator_rep.delete",
      entityType: "operator_rep",
      entityId: String(id),
      ipAddress: req.ip ?? null,
    });

    res.json({ ok: true });
  }),
);

router.get(
  "/admin/audit-logs",
  asyncHandler(async (_req, res) => {
    res.json(await repo.listAuditLogs());
  }),
);

export default router;
