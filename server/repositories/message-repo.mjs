import db from "../models/index.mjs";

/**
 * Creates a new message for a specific report.
 */
export async function createMessage(messageData) {
  return db.Message.create(messageData);
}

/**
 * Finds all messages associated with a specific report ID.
 * Includes the author (User) details for UI display.
 * Ordered by creation time (Oldest -> Newest).
 * * @param {number} reportId - The ID of the report.
 * @returns {Promise<Array>} List of messages.
 */
export async function findMessagesByReportId(reportId) {
  return db.Message.findAll({
    where: {
      reportId,
    },
    include: [
      {
        model: db.User,
        as: "author",
        attributes: [
          "id",
          "username",
          "firstName",
          "lastName",
          "photoURL",
        ],
      },
    ],

    order: [["createdAt", "ASC"]],
  });
}
