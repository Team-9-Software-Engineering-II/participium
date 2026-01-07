import { findAllByUserId, markAsRead as markNotificationRead, markAllAsRead as markAllNotificationsRead, deleteNotification as deleteNotificationRepo } from "../repositories/notification-repo.mjs";
import AppError from "../shared/utils/app-error.mjs";
import db from "../models/index.mjs";

export class NotificationService {
  /**
   * Retrieves notifications for a specific user.
   * @param {number} userId
   * @returns {Promise<Array>} List of notifications
   */
  static async getUserNotifications(userId) {
    return await findAllByUserId(userId);
  }

  /**
   * Marks a single notification as read.
   * @param {number} userId
   * @param {number} notificationId
   */
  static async markAsRead(userId, notificationId) {
    const updated = await markNotificationRead(notificationId, userId);
    if (!updated) {
      throw new AppError('Notification not found or does not belong to user', 404);
    }
    return updated;
  }

  /**
   * Marks all notifications as read for a user.
   * @param {number} userId
   */
  static async markAllAsRead(userId) {
    return await markAllNotificationsRead(userId);
  }

  /**
   * Deletes a single notification.
   * @param {number} userId
   * @param {number} notificationId
   */
  static async deleteNotification(userId, notificationId) {
    // Verify the notification belongs to the user
    const notification = await db.Notification.findOne({
      where: { id: notificationId, userId }
    });
    
    if (!notification) {
      throw new AppError('Notification not found or does not belong to user', 404);
    }
    
    await deleteNotificationRepo(notificationId);
    return true;
  }
}