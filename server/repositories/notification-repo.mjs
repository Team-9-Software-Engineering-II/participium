import db from "../models/index.mjs";

/**
 * Creates a new notification in the database.
 * Supports transactions to ensure data integrity when called
 * within a complex flow (e.g., message creation).
 * @param {object} notificationData - { userId, type, title, message, reportId, data }
 * @param {object} [t] - Optional Sequelize Transaction object
 */
export const createNotification = async (notificationData, t = null) => {
  return await db.Notification.create(notificationData, { transaction: t });
};

/**
 * Retrieves all notifications for a specific user.
 * Ordered from newest to oldest.
 * Includes essential data from the associated Report (if present).
 * @param {number} userId
 * @param {number} limit - Optional, for pagination or "last 10"
 */
export const findAllByUserId = async (userId, limit = 50) => {
  return await db.Notification.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
    include: [
      {
        model: db.Report,
        as: "report",
        attributes: ["id", "title", "status"],
        required: false,
      },
    ],
  });
};

/**
 * Counts the number of UNREAD notifications for a user.
 * Useful for the red badge on the bell icon in the frontend.
 * * @param {number} userId
 */
export const countUnreadNotifications = async (userId) => {
  return await db.Notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
};

/**
 * Marks a specific notification as read.
 * * @param {number} notificationId
 * @param {number} userId
 */
export const markAsRead = async (notificationId, userId) => {
  const [updatedRows] = await db.Notification.update(
    { isRead: true },
    {
      where: {
        id: notificationId,
        userId,
      },
    }
  );
  return updatedRows > 0;
};

/**
 * Marks ALL notifications for a user as read.
 * * @param {number} userId
 */
export const markAllAsRead = async (userId) => {
  return await db.Notification.update(
    { isRead: true },
    {
      where: {
        userId,
        isRead: false,
      },
    }
  );
};

/**
 * Deletes a specific notification.
 * * @param {number} notificationId
 */
export const deleteNotification = async (notificationId) => {
  return await db.Notification.destroy({
    where: { id: notificationId },
  });
};
