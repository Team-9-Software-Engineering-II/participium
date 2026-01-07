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
 * * @param {boolean} internal - To indicate to retry internal messages or messages with the citizen owner of the report.
 * @returns {Promise<Array>} List of messages.
 */
export async function findMessagesByReportId(reportId, internal = true) {
  return db.Message.findAll({
    where: {
      reportId,
      isInternal: internal,
    },
    include: [
      {
        model: db.User,
        as: "author",
        attributes: ["id", "username", "firstName", "lastName", "photoURL"],
        include: [
          {
            model: db.Role,
            as: "roles",
            attributes: ["id", "name"],
            through: { attributes: [] },
          },
        ],
      },
    ],

    order: [["createdAt", "ASC"]],
  });
}
