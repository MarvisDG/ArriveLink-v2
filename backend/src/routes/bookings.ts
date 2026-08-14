import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  acceptBooking,
  boardBooking,
  createBooking,
  createBookingSchema,
  getBooking,
  getOperatorWallet,
  listBookingsByPhone,
  listOperatorActive,
  listOperatorRequests,
  markBookingPaid,
  rejectBooking,
  searchForBoarding,
} from "../application/booking/booking-service";
import {
  authenticate,
  optionalAuth,
  requireOperator,
} from "../middleware/authenticate";
import { asyncHandler } from "../middleware/error-handler";

const router: IRouter = Router();

const idParam = z.coerce.number().int().positive();

// ── Traveler ────────────────────────────────────────────────────────────────

/**
 * `optionalAuth`: a guest can reserve a seat — PRD §3 puts registration after
 * the booking, not before it. When a token is present the booking is attributed
 * to that user so it shows up in their history.
 */
router.post(
  "/bookings",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = createBookingSchema.parse(req.body);
    const booking = await createBooking(input, req.auth?.userId);
    res.status(201).json(booking);
  }),
);

/**
 * Guests look their bookings up by the phone number they booked with, which is
 * the only identifier they have. Signed-in travelers get their own list without
 * needing to supply one.
 */
router.get(
  "/bookings",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const phone = z
      .string()
      .trim()
      .min(1, "phone query parameter is required")
      .parse(req.query.phone);
    res.json(await listBookingsByPhone(phone));
  }),
);

router.get(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    res.json(await getBooking(idParam.parse(req.params.id)));
  }),
);

/**
 * Development stand-in for the Paystack webhook. The service refuses to run
 * this in production, where the webhook is the only thing that may mark a
 * booking paid (PRD §9).
 */
router.post(
  "/bookings/:id/pay",
  asyncHandler(async (req, res) => {
    res.json(await markBookingPaid(idParam.parse(req.params.id)));
  }),
);

// ── Operator ────────────────────────────────────────────────────────────────

router.get(
  "/operator/bookings/requests",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await listOperatorRequests(requireOperator(req)));
  }),
);

router.get(
  "/operator/bookings/active",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await listOperatorActive(requireOperator(req)));
  }),
);

router.get(
  "/operator/bookings/search",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const q = z.string().trim().min(1, "q parameter is required").parse(req.query.q);
    res.json(await searchForBoarding(q, operatorId));
  }),
);

router.post(
  "/operator/bookings/requests/:id/accept",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const booking = await acceptBooking(
      idParam.parse(req.params.id),
      operatorId,
      req.auth!.userId,
    );
    res.json(booking);
  }),
);

router.post(
  "/operator/bookings/requests/:id/reject",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    const reason = z.string().trim().max(500).optional().parse(req.body?.reason);
    const booking = await rejectBooking(
      idParam.parse(req.params.id),
      operatorId,
      req.auth!.userId,
      reason,
    );
    res.json(booking);
  }),
);

router.post(
  "/operator/bookings/:id/board",
  authenticate,
  asyncHandler(async (req, res) => {
    const operatorId = requireOperator(req);
    res.json(await boardBooking(idParam.parse(req.params.id), operatorId));
  }),
);

router.get(
  "/operator/wallet",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(await getOperatorWallet(requireOperator(req)));
  }),
);

export default router;
