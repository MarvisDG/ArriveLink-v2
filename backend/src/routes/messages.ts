import { Router, type IRouter, type Request } from "express";
import { z } from "zod";
import * as repo from "../infrastructure/db/repositories/messaging-repository";
import { operatorExists } from "../infrastructure/db/repositories/catalog-repository";
import { findUserById } from "../infrastructure/db/repositories/user-repository";
import { authenticate, optionalAuth } from "../middleware/authenticate";
import { asyncHandler } from "../middleware/error-handler";
import {
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../domain/shared/errors";

const router: IRouter = Router();

const idParam = z.coerce.number().int().positive();

const startSchema = z.object({
  company_id: idParam,
  initial_message: z.string().trim().min(1, "Write a message").max(4000),
  guest_name: z.string().trim().min(2).max(120).optional(),
  guest_email: z.string().trim().email().optional(),
});

const sendSchema = z.object({
  body: z.string().trim().min(1, "Write a message").max(4000),
});

/**
 * Resolve the caller to a conversation participant.
 *
 * An operator rep is scoped to their operator, a traveler to themselves. This
 * is what every read and write below is filtered by, so a conversation id alone
 * never grants access.
 */
function viewerFor(req: Request): repo.Viewer {
  if (!req.auth) throw new UnauthenticatedError();
  if (req.auth.role === "operator_rep" && req.auth.operatorId !== undefined) {
    return { kind: "operator", operatorId: req.auth.operatorId };
  }
  return { kind: "user", userId: req.auth.userId };
}

/**
 * Guests may open an enquiry — PRD §3 puts registration after the booking, and
 * asking a question comes before that. A guest supplies their name instead of a
 * token; a signed-in traveler supplies neither.
 */
router.post(
  "/messages/start",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = startSchema.parse(req.body);

    if (!(await operatorExists(input.company_id))) {
      throw new NotFoundError("Company", input.company_id);
    }

    let senderName: string;
    if (req.auth) {
      const user = await findUserById(req.auth.userId);
      if (!user) throw new UnauthenticatedError("Account no longer exists");
      senderName = user.name;
    } else {
      if (!input.guest_name) {
        throw new ValidationError(
          "guest_name is required when you are not signed in",
        );
      }
      senderName = input.guest_name;
    }

    const { conversation, message } = await repo.startConversation({
      operatorId: input.company_id,
      userId: req.auth?.userId ?? null,
      // Guest identity is only meaningful when there is no account behind it.
      guestName: req.auth ? null : (input.guest_name ?? null),
      guestEmail: req.auth ? null : (input.guest_email ?? null),
      senderName,
      body: input.initial_message,
    });

    res.status(201).json({
      conversation_id: conversation.id,
      message: {
        id: message.id,
        conversation_id: conversation.id,
        sender_type: "user",
        sender_name: message.senderName,
        body: message.body,
        created_at: message.createdAt.toISOString(),
      },
    });
  }),
);

router.get(
  "/messages/conversations",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await repo.listConversationsFor(viewerFor(req)));
  }),
);

router.get(
  "/messages/conversations/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = viewerFor(req);
    const conversationId = idParam.parse(req.params.id);

    // Scoped lookup: not yours reads as not found, so ids cannot be probed.
    const conversation = await repo.findConversationFor(conversationId, viewer);
    if (!conversation) throw new NotFoundError("Conversation", conversationId);

    const messages = await repo.listMessages(conversationId);
    await repo.markRead(conversationId, viewer);

    res.json({ conversation_id: conversationId, conversation, messages });
  }),
);

router.post(
  "/messages/conversations/:id/send",
  authenticate,
  asyncHandler(async (req, res) => {
    const viewer = viewerFor(req);
    const conversationId = idParam.parse(req.params.id);
    const { body } = sendSchema.parse(req.body);

    const conversation = await repo.findConversationFor(conversationId, viewer);
    if (!conversation) throw new NotFoundError("Conversation", conversationId);

    let senderName: string;
    if (viewer.kind === "operator") {
      senderName = conversation.company_name;
    } else {
      const user = await findUserById(viewer.userId);
      senderName = user?.name ?? "Traveler";
    }

    const message = await repo.appendMessage({
      conversationId,
      senderType: viewer.kind === "operator" ? "operator" : "user",
      senderName,
      body,
    });

    res.status(201).json({
      id: message.id,
      conversation_id: conversationId,
      sender_type: viewer.kind === "operator" ? "company" : "user",
      sender_name: message.senderName,
      body: message.body,
      created_at: message.createdAt.toISOString(),
    });
  }),
);

export default router;
