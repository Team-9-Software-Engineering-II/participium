import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/user-controller.js";
import { isAuthenticated } from "../middlewares/auth.mjs";

const router = Router();

/**
 * User profile endpoints.
 */
router.get("/me", isAuthenticated, getProfile);
router.put("/me", isAuthenticated, updateProfile);

export default router;
