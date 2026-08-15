import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../client";
import { conversations, messages } from "../schema/messaging";
import { operators } from "../schema/operators";
import { users } from "../schema/users";

/**
 * Pre-booking traveler ↔ operator enquiries.
 *
 * Access is always scoped by the caller's identity — `findConversationFor`
 * takes the viewer and returns undefined when the conversation is not theirs.
 * The previous implementation looked conversations up by id alone, so any
 * authenticated caller could read any conversation by guessing a number.
 */

export type Viewer =
  | { kind: "user"; userId: number }
  | { kind: "operator"; operatorId: number };

/** Ownership expressed as a WHERE clause, so it cannot be forgotten by a caller. */
function scopeFor(viewer: Viewer) {
  return viewer.kind === "user"
    ? eq(conversations.userId, viewer.userId)
    : eq(conversations.operatorId, viewer.operatorId);
}

export async function findConversationFor(
  conversationId: number,
  viewer: Viewer,
  exec: DbExecutor = db,
) {
  const [row] = await exec
    .select({
      id: conversations.id,
      operator_id: conversations.operatorId,
      user_id: conversations.userId,
      guest_name: conversations.guestName,
      guest_email: conversations.guestEmail,
      unread_user: conversations.unreadUser,
      unread_operator: conversations.unreadOperator,
      last_message_at: conversations.lastMessageAt,
      created_at: conversations.createdAt,
      company_name: operators.businessName,
      company_logo_url: operators.logoUrl,
      user_name: users.name,
    })
    .from(conversations)
    .innerJoin(operators, eq(conversations.operatorId, operators.id))
    .leftJoin(users, eq(conversations.userId, users.id))
    .where(and(eq(conversations.id, conversationId), scopeFor(viewer)))
    .limit(1);

  if (!row) return undefined;

  return {
    ...row,
    counterparty_name:
      viewer.kind === "operator"
        ? (row.user_name ?? row.guest_name ?? "Guest")
        : row.company_name,
    unread_count:
      viewer.kind === "operator" ? row.unread_operator : row.unread_user,
    last_message_at: row.last_message_at.toISOString(),
    created_at: row.created_at.toISOString(),
  };
}

export async function listConversationsFor(
  viewer: Viewer,
  exec: DbExecutor = db,
) {
  const rows = await exec
    .select({
      id: conversations.id,
      operator_id: conversations.operatorId,
      user_id: conversations.userId,
      guest_name: conversations.guestName,
      guest_email: conversations.guestEmail,
      unread_user: conversations.unreadUser,
      unread_operator: conversations.unreadOperator,
      last_message_at: conversations.lastMessageAt,
      created_at: conversations.createdAt,
      company_name: operators.businessName,
      company_logo_url: operators.logoUrl,
      user_name: users.name,
      // The preview line in the conversation list. A correlated subquery keeps
      // this one round trip instead of N+1 across the list.
      last_message: sql<string | null>`(
        select m.body from ${messages} m
        where m.conversation_id = ${conversations.id}
        order by m.created_at desc limit 1
      )`,
    })
    .from(conversations)
    .innerJoin(operators, eq(conversations.operatorId, operators.id))
    .leftJoin(users, eq(conversations.userId, users.id))
    .where(scopeFor(viewer))
    .orderBy(desc(conversations.lastMessageAt));

  return rows.map((r) => ({
    id: r.id,
    company_id: r.operator_id,
    company_name: r.company_name,
    company_logo_url: r.company_logo_url,
    user_id: r.user_id,
    // Whoever the *other* side is, from this viewer's seat: an operator sees
    // the traveler (registered or guest), a traveler sees the company.
    counterparty_name:
      viewer.kind === "operator"
        ? (r.user_name ?? r.guest_name ?? "Guest")
        : r.company_name,
    // Null for a registered traveler — only a real guest has one.
    guest_name: r.guest_name,
    guest_email: r.guest_email,
    // Viewer-relative, so the UI never has to know which column is "mine".
    unread_count: viewer.kind === "operator" ? r.unread_operator : r.unread_user,
    last_message: r.last_message,
    last_message_at: r.last_message_at.toISOString(),
    created_at: r.created_at.toISOString(),
  }));
}

export async function listMessages(
  conversationId: number,
  exec: DbExecutor = db,
) {
  const rows = await exec
    .select({
      id: messages.id,
      conversation_id: messages.conversationId,
      sender_type: messages.senderType,
      sender_name: messages.senderName,
      body: messages.body,
      created_at: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return rows.map((r) => ({
    ...r,
    // The public contract calls the operator side "company".
    sender_type: r.sender_type === "operator" ? "company" : r.sender_type,
    created_at: r.created_at.toISOString(),
  }));
}

export async function startConversation(
  input: {
    operatorId: number;
    userId?: number | null;
    guestName?: string | null;
    guestEmail?: string | null;
    senderName: string;
    body: string;
  },
  exec: DbExecutor = db,
) {
  return (exec as typeof db).transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({
        operatorId: input.operatorId,
        userId: input.userId ?? null,
        guestName: input.guestName ?? null,
        guestEmail: input.guestEmail ?? null,
        // The opening message is unread for the operator, not for its author.
        unreadOperator: 1,
        unreadUser: 0,
      })
      .returning();

    if (!conversation) throw new Error("Insert returned no row");

    const [message] = await tx
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderType: "user",
        senderName: input.senderName,
        body: input.body,
      })
      .returning();

    return { conversation, message };
  });
}

export async function appendMessage(
  input: {
    conversationId: number;
    senderType: "user" | "operator";
    senderName: string;
    body: string;
  },
  exec: DbExecutor = db,
) {
  return (exec as typeof db).transaction(async (tx) => {
    const [message] = await tx
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        senderType: input.senderType,
        senderName: input.senderName,
        body: input.body,
      })
      .returning();

    if (!message) throw new Error("Insert returned no row");

    // The unread counter that moves is the *recipient's*.
    await tx
      .update(conversations)
      .set({
        lastMessageAt: message.createdAt,
        ...(input.senderType === "user"
          ? { unreadOperator: sql`${conversations.unreadOperator} + 1` }
          : { unreadUser: sql`${conversations.unreadUser} + 1` }),
      })
      .where(eq(conversations.id, input.conversationId));

    return message;
  });
}

export async function markRead(
  conversationId: number,
  viewer: Viewer,
  exec: DbExecutor = db,
): Promise<void> {
  await exec
    .update(conversations)
    .set(
      viewer.kind === "user" ? { unreadUser: 0 } : { unreadOperator: 0 },
    )
    .where(and(eq(conversations.id, conversationId), scopeFor(viewer)));

  await exec
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        // Only the other party's messages become read.
        viewer.kind === "user"
          ? eq(messages.senderType, "operator")
          : eq(messages.senderType, "user"),
        sql`${messages.readAt} is null`,
      ),
    );
}
