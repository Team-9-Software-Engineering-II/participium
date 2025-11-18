import { Router } from "express";
import {
  currentSession,
  login,
  logout,
  register,
} from "../controllers/auth-controller.js";
import { isAdmin, isAuthenticated } from "../middlewares/auth.mjs";

const router = Router();

/**
 * Registers authentication endpoints.
 */
router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuthenticated, logout);
router.get("/session", isAuthenticated, currentSession);

export default router;
