import { Router } from "express";
import {
  userRegister,
  userLogin,
  getUserFromToken,
  getUserProfile,
} from "../lib/mock-db";

const router = Router();

router.post("/users/auth/register", (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }
    const result = userRegister({ name, email, phone, password });
    return res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    if (message.includes("already registered")) {
      return res.status(409).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

router.post("/users/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const result = userLogin(email, password);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return res.status(401).json({ error: message });
  }
});

router.get("/users/me", (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const profile = getUserProfile(user.id);
  return res.json(profile);
});

export default router;
