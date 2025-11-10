import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/user-controller.js";

const router = Router();

/**
 * User profile endpoints.
 */
router.get("/me", getProfile);
router.put("/me", updateProfile);

export default router;
