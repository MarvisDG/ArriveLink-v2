import { desc, eq, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../client";
import { auditLogs } from "../schema/auth";
import { conversations, messages } from "../schema/messaging";
import { operators } from "../schema/operators";
import { operatorReps } from "../schema/operator-reps";
import { users } from "../schema/users";

/** Data access for the admin console (PRD §2 — admin permissions). */

export async function stats(exec: DbExecutor = db) {
  const [row] = await exec
    .select({
      total_users: sql<number>`(select count(*) from ${users} where role = 'traveler')::int`,
      total_companies: sql<number>`(select count(*) from ${operators})::int`,
      total_operators: sql<number>`(select count(*) from ${operatorReps})::int`,
      total_messages: sql<number>`(select count(*) from ${messages})::int`,
    })
    .from(sql`(select 1) as _`);

  return (
    row ?? {
      total_users: 0,
      total_companies: 0,
      total_operators: 0,
      total_messages: 0,
    }
  );
}

export async function listUsers(limit = 200, exec: DbExecutor = db) {
  const rows = await exec
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      created_at: users.createdAt,
      conversation_count: sql<number>`(
        select count(*)::int from ${conversations} c where c.user_id = ${users.id}
      )`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);

  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
}

export async function deleteUser(
  id: number,
  exec: DbExecutor = db,
): Promise<boolean> {
  const [row] = await exec
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });
  return Boolean(row);
}

export async function listCompanies(exec: DbExecutor = db) {
  const rows = await exec
    .select({
      id: operators.id,
      name: operators.businessName,
      invite_code: operators.inviteCode,
      rating: operators.rating,
      review_count: operators.reviewCount,
      is_verified: operators.isVerified,
      featured: operators.featured,
      status: operators.status,
    })
    .from(operators)
    .orderBy(desc(operators.featured), operators.businessName);

  return rows.map((r) => ({ ...r, rating: Number(r.rating) }));
}

export async function updateCompanyFlags(
  id: number,
  flags: { isVerified?: boolean; featured?: boolean },
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .update(operators)
    .set({ ...flags, updatedAt: new Date() })
    .where(eq(operators.id, id))
    .returning({
      id: operators.id,
      is_verified: operators.isVerified,
      featured: operators.featured,
    });
  return row;
}

/** Reps, joined to the operator they act for. */
export async function listOperatorReps(exec: DbExecutor = db) {
  const rows = await exec
    .select({
      id: operatorReps.id,
      user_id: operatorReps.userId,
      email: users.email,
      name: users.name,
      company_name: operators.businessName,
      company_id: operators.id,
      is_active: operatorReps.isActive,
      created_at: operatorReps.createdAt,
    })
    .from(operatorReps)
    .innerJoin(users, eq(operatorReps.userId, users.id))
    .innerJoin(operators, eq(operatorReps.operatorId, operators.id))
    .orderBy(desc(operatorReps.createdAt));

  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
}

/**
 * Removing a rep deletes the underlying user, and `operator_reps.user_id`
 * cascades. Deleting only the rep row would strand a login that can still
 * authenticate but resolves to no operator.
 */
export async function deleteOperatorRep(
  repId: number,
  exec: DbExecutor = db,
): Promise<boolean> {
  const [rep] = await exec
    .select({ userId: operatorReps.userId })
    .from(operatorReps)
    .where(eq(operatorReps.id, repId))
    .limit(1);

  if (!rep) return false;

  await exec.delete(users).where(eq(users.id, rep.userId));
  return true;
}

/** Append-only record of who changed what (PRD §2 — "view audit logs"). */
export async function recordAudit(
  entry: {
    actorId?: number | null;
    actorLabel: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: unknown;
    ipAddress?: string | null;
  },
  exec: DbExecutor = db,
): Promise<void> {
  await exec.insert(auditLogs).values({
    actorId: entry.actorId ?? null,
    actorLabel: entry.actorLabel,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}

export async function listAuditLogs(limit = 100, exec: DbExecutor = db) {
  const rows = await exec
    .select({
      id: auditLogs.id,
      actor_id: auditLogs.actorId,
      actor_label: auditLogs.actorLabel,
      action: auditLogs.action,
      entity_type: auditLogs.entityType,
      entity_id: auditLogs.entityId,
      metadata: auditLogs.metadata,
      ip_address: auditLogs.ipAddress,
      created_at: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((r) => ({ ...r, created_at: r.created_at.toISOString() }));
}
