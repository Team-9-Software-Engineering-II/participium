import { Router } from "express";
import { 
  getMyNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification
} from "../controllers/notification-controller.js";
import { isAuthenticated } from "../middlewares/auth.mjs";

const router = Router();

// GET /api/notifications
router.get("/", isAuthenticated, getMyNotifications);

// PUT /api/notifications/read-all
router.put("/read-all", isAuthenticated, markAllNotificationsAsRead);

// PUT /api/notifications/:notificationId/read
router.put("/:notificationId/read", isAuthenticated, markNotificationAsRead);

// DELETE /api/notifications/:notificationId
router.delete("/:notificationId", isAuthenticated, deleteNotification);

export default router;