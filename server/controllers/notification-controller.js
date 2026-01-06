import { NotificationService } from "../services/notification-service.mjs";

/**
 * Handles fetching notifications for the logged-in user.
 * Route: GET /api/notifications
 */
export async function getMyNotifications(req, res, next) {
  try {
    const userId = req.user.id;

    const notifications = await NotificationService.getUserNotifications(userId);

    return res.status(200).json(notifications);
  } catch (error) {
    return next(error);
  }
}