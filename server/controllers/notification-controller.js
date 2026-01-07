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

/**
 * Marks a single notification as read.
 * Route: PUT /api/notifications/:notificationId/read
 */
export async function markNotificationAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const notificationId = Number.parseInt(req.params.notificationId);

    await NotificationService.markAsRead(userId, notificationId);

    return res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    return next(error);
  }
}

/**
 * Marks all notifications as read for the logged-in user.
 * Route: PUT /api/notifications/read-all
 */
export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    await NotificationService.markAllAsRead(userId);

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a single notification
 * Route: DELETE /notifications/:notificationId
 */
export async function deleteNotification(req, res, next) {
  try {
    const userId = req.user.id;
    const notificationId = Number.parseInt(req.params.notificationId);

    await NotificationService.deleteNotification(userId, notificationId);

    return res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    return next(error);
  }
}