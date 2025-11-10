import { Router } from "express";
import {
  currentSession,
  login,
  logout,
  register,
} from "../controllers/auth-controller.js";

const router = Router();

/**
 * Registers authentication endpoints.
 */
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/session", currentSession);

export default router;

