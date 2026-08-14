import { and, eq, isNull, sql, desc, gt } from "drizzle-orm";
import { db, type DbExecutor } from "../client";
import { users, type User, type NewUser } from "../schema/users";
import { operatorReps } from "../schema/operator-reps";
import { operators } from "../schema/operators";
import { refreshTokens } from "../schema/auth";

/**
 * Data access for users, sessions and the rep→operator link.
 *
 * Every method takes an optional executor so a use case can run several of them
 * inside one transaction — registering a user and issuing their first refresh
 * token must either both happen or neither.
 */

/** Case-insensitive email match, matching the `users_email_lower_unique` index. */
export async function findUserByEmail(
  email: string,
  exec: DbExecutor = db,
): Promise<User | undefined> {
  const [row] = await exec
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return row;
}

export async function findUserById(
  id: number,
  exec: DbExecutor = db,
): Promise<User | undefined> {
  const [row] = await exec.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function insertUser(
  values: NewUser,
  exec: DbExecutor = db,
): Promise<User> {
  const [row] = await exec.insert(users).values(values).returning();
  if (!row) throw new Error("Insert returned no row");
  return row;
}

export async function updateUser(
  id: number,
  values: Partial<NewUser>,
  exec: DbExecutor = db,
): Promise<User | undefined> {
  const [row] = await exec
    .update(users)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return row;
}

export async function touchLastLogin(
  id: number,
  exec: DbExecutor = db,
): Promise<void> {
  await exec
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, id));
}

/**
 * The operator a rep acts for, plus the operator row itself — the login response
 * needs both the id and the business name, and this is the only join that would
 * otherwise be repeated in every operator route.
 */
export async function findOperatorForUser(
  userId: number,
  exec: DbExecutor = db,
): Promise<{ operatorId: number; businessName: string; repId: number } | undefined> {
  const [row] = await exec
    .select({
      operatorId: operators.id,
      businessName: operators.businessName,
      repId: operatorReps.id,
    })
    .from(operatorReps)
    .innerJoin(operators, eq(operatorReps.operatorId, operators.id))
    .where(and(eq(operatorReps.userId, userId), eq(operatorReps.isActive, true)))
    .limit(1);
  return row;
}

// ── Refresh tokens ──────────────────────────────────────────────────────────

export async function storeRefreshToken(
  values: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  },
  exec: DbExecutor = db,
): Promise<number> {
  const [row] = await exec
    .insert(refreshTokens)
    .values(values)
    .returning({ id: refreshTokens.id });
  if (!row) throw new Error("Insert returned no row");
  return row.id;
}

/** A token is usable only if it exists, is unrevoked and has not expired. */
export async function findLiveRefreshToken(
  tokenHash: string,
  exec: DbExecutor = db,
): Promise<{ id: number; userId: number; replacedById: number | null } | undefined> {
  const [row] = await exec
    .select({
      id: refreshTokens.id,
      userId: refreshTokens.userId,
      replacedById: refreshTokens.replacedById,
    })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);
  return row;
}

export async function isRefreshTokenUsable(
  tokenHash: string,
  exec: DbExecutor = db,
): Promise<{ id: number; userId: number } | undefined> {
  const [row] = await exec
    .select({ id: refreshTokens.id, userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row;
}

export async function revokeRefreshToken(
  id: number,
  replacedById: number | null,
  exec: DbExecutor = db,
): Promise<void> {
  await exec
    .update(refreshTokens)
    .set({ revokedAt: new Date(), replacedById })
    .where(eq(refreshTokens.id, id));
}

/**
 * Revoke every live session for a user.
 *
 * Called on logout-everywhere and on detected refresh-token replay: if a token
 * that was already rotated is presented again, we cannot tell the thief from the
 * legitimate holder, so both are logged out.
 */
export async function revokeAllUserTokens(
  userId: number,
  exec: DbExecutor = db,
): Promise<void> {
  await exec
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

export async function listUsers(
  limit = 50,
  exec: DbExecutor = db,
): Promise<User[]> {
  return exec.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
}

export async function countUsers(exec: DbExecutor = db): Promise<number> {
  const [row] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return row?.count ?? 0;
}
