import { Router } from "express";
import * as db from "../lib/mock-db";

const router = Router();

function getOperatorToken(req: { headers: { authorization?: string } }) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return db.getOperatorFromToken(auth.slice(7));
}

router.get("/routes/:id", (req, res) => {
  const id = parseInt(req.params.id ?? "0");
  const route = db.getRouteDetail(id);
  if (!route) return res.status(404).json({ error: "Route not found" });
  return res.json(route);
});

router.post("/bookings", (req, res) => {
  try {
    const { route_id, traveler_name, traveler_phone, seats_requested, departure_time } = req.body;
    if (!route_id || !traveler_name || !traveler_phone || !seats_requested || !departure_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const auth = req.headers.authorization;
    let traveler_id: number | undefined;
    if (auth?.startsWith("Bearer ")) {
      const user = db.getUserFromToken(auth.slice(7));
      if (user) traveler_id = user.id;
    }
    const booking = db.createBooking({
      route_id: parseInt(String(route_id)),
      traveler_id,
      traveler_name: String(traveler_name),
      traveler_phone: String(traveler_phone),
      seats_requested: parseInt(String(seats_requested)),
      departure_time: String(departure_time),
    });
    return res.status(201).json(booking);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

router.get("/bookings", (req, res) => {
  const { phone } = req.query;
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "phone query parameter is required" });
  }
  return res.json(db.getTravelerBookings(phone));
});

router.get("/bookings/:id", (req, res) => {
  const id = parseInt(req.params.id ?? "0");
  const booking = db.getBookingDetail(id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  return res.json(booking);
});

router.post("/bookings/:id/pay", (req, res) => {
  try {
    const id = parseInt(req.params.id ?? "0");
    const booking = db.payBooking(id);
    return res.json(booking);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Payment failed" });
  }
});

router.get("/operator/bookings/requests", (req, res) => {
  const operator = getOperatorToken(req);
  if (!operator) return res.status(401).json({ error: "Unauthorized" });
  return res.json(db.getOperatorBookingRequests(operator.company_id));
});

router.post("/operator/bookings/requests/:id/accept", (req, res) => {
  try {
    const operator = getOperatorToken(req);
    if (!operator) return res.status(401).json({ error: "Unauthorized" });
    const id = parseInt(req.params.id ?? "0");
    const booking = db.acceptBookingRequest(id, operator.company_id);
    return res.json(booking);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

router.post("/operator/bookings/requests/:id/reject", (req, res) => {
  try {
    const operator = getOperatorToken(req);
    if (!operator) return res.status(401).json({ error: "Unauthorized" });
    const id = parseInt(req.params.id ?? "0");
    const booking = db.rejectBookingRequest(id, operator.company_id);
    return res.json(booking);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

router.get("/operator/bookings/active", (req, res) => {
  const operator = getOperatorToken(req);
  if (!operator) return res.status(401).json({ error: "Unauthorized" });
  return res.json(db.getOperatorActiveBookings(operator.company_id));
});

router.get("/operator/bookings/search", (req, res) => {
  const operator = getOperatorToken(req);
  if (!operator) return res.status(401).json({ error: "Unauthorized" });
  const { q } = req.query;
  if (!q || typeof q !== "string") return res.status(400).json({ error: "q param required" });
  const booking = db.searchBookingForBoarding(q, operator.company_id);
  if (!booking) return res.status(404).json({ error: "No booking found matching that query" });
  return res.json(booking);
});

router.post("/operator/bookings/:id/board", (req, res) => {
  try {
    const operator = getOperatorToken(req);
    if (!operator) return res.status(401).json({ error: "Unauthorized" });
    const id = parseInt(req.params.id ?? "0");
    const booking = db.boardBooking(id, operator.company_id);
    return res.json(booking);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

router.get("/operator/wallet", (req, res) => {
  const operator = getOperatorToken(req);
  if (!operator) return res.status(401).json({ error: "Unauthorized" });
  return res.json(db.getOperatorWallet(operator.company_id));
});

export default router;
