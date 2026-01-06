import { Router } from "express";
import { getMyNotifications } from "../controllers/notification-controller.js";
import { isAuthenticated } from "../middlewares/auth.mjs";

const router = Router();

// GET /api/notifications
router.get("/", isAuthenticated, getMyNotifications);

export default router;