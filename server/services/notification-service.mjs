import { findAllByUserId } from "../repositories/notification-repo.mjs";

export class NotificationService {
  /**
   * Retrieves notifications for a specific user.
   * @param {number} userId
   * @returns {Promise<Array>} List of notifications
   */
  static async getUserNotifications(userId) {
    return await findAllByUserId(userId);
  }
}