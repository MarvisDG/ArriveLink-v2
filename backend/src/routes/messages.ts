import { Router } from "express";
import {
  getUserFromToken,
  getOperatorFromToken,
  getOperatorProfile,
  getUserConversations,
  getCompanyConversations,
  getConversationMessages,
  sendMessage,
  startConversation,
  markConversationRead,
} from "../lib/mock-db";

const router = Router();

function getAuthContext(headers: Record<string, string | string[] | undefined>) {
  const authHeader = (headers["authorization"] ?? "") as string;
  const token = authHeader.replace("Bearer ", "");
  const user = getUserFromToken(token);
  if (user) return { role: "user" as const, user, operator: null };
  const operator = getOperatorFromToken(token);
  if (operator) return { role: "operator" as const, user: null, operator };
  return null;
}

router.post("/messages/start", (req, res) => {
  try {
    const { company_id, initial_message, guest_name, guest_email } = req.body;
    if (!company_id || !initial_message) {
      return res.status(400).json({ error: "company_id and initial_message are required" });
    }

    const token = ((req.headers["authorization"] ?? "") as string).replace("Bearer ", "");
    const user = getUserFromToken(token);

    if (!user && !guest_name) {
      return res.status(400).json({ error: "guest_name is required when not logged in" });
    }

    const result = startConversation({
      user_id: user?.id,
      guest_name: guest_name ?? undefined,
      guest_email: guest_email ?? undefined,
      company_id,
      initial_message,
    });

    return res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start conversation";
    return res.status(500).json({ error: message });
  }
});

router.get("/messages/conversations", (req, res) => {
  const ctx = getAuthContext(req.headers as Record<string, string | string[] | undefined>);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  if (ctx.role === "user") {
    return res.json(getUserConversations(ctx.user.id));
  }

  if (ctx.role === "operator") {
    const profile = getOperatorProfile(ctx.operator.id);
    if (!profile) return res.status(404).json({ error: "Operator not found" });
    return res.json(getCompanyConversations(profile.company.id));
  }

  return res.status(401).json({ error: "Unauthorized" });
});

router.get("/messages/conversations/:id", (req, res) => {
  const ctx = getAuthContext(req.headers as Record<string, string | string[] | undefined>);
  if (!ctx) return res.status(401).json({ error: "Unauthorized" });

  const conversationId = parseInt(req.params.id, 10);
  const msgs = getConversationMessages(conversationId);

  if (ctx.role === "user") {
    markConversationRead(conversationId, "user");
  } else {
    markConversationRead(conversationId, "company");
  }

  return res.json({ conversation_id: conversationId, messages: msgs });
});

router.post("/messages/conversations/:id/send", (req, res) => {
  try {
    const ctx = getAuthContext(req.headers as Record<string, string | string[] | undefined>);
    if (!ctx) return res.status(401).json({ error: "Unauthorized" });

    const conversationId = parseInt(req.params.id, 10);
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: "body is required" });

    let senderName: string;
    let senderType: "user" | "company";

    if (ctx.role === "user") {
      senderName = ctx.user.name;
      senderType = "user";
    } else {
      const profile = getOperatorProfile(ctx.operator.id);
      senderName = profile?.company.name ?? "Company";
      senderType = "company";
    }

    const msg = sendMessage({
      conversation_id: conversationId,
      sender_type: senderType,
      sender_name: senderName,
      body,
    });

    return res.status(201).json(msg);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return res.status(500).json({ error: message });
  }
});

export default router;
