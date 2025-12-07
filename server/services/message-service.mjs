import { createMessage, findMessagesByReportId } from "../repositories/message-repo.mjs";
import { findReportById } from "../repositories/report-repo.mjs";

/**
 * Encapsulates message business logic and orchestrates repository calls.
 */
export class MessageService {
  /**
   * Creates a new message for a report.
   * @param {number} userId - Identifier of the user creating the message (from session).
   * @param {number} reportId - Identifier of the report the message belongs to.
   * @param {string} content - The message content.
   * @returns {Promise<object>} The created message with author details.
   */
  static async createMessage(userId, reportId, content) {
    // Validate that the report exists
    const report = await findReportById(reportId);
    if (!report) {
      const error = new Error("Report not found.");
      error.statusCode = 404;
      throw error;
    }

    // Validate content is provided and not empty
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      const error = new Error("Message content is required and cannot be empty.");
      error.statusCode = 400;
      throw error;
    }

    // Create the message
    const createdMessage = await createMessage({
      content: content.trim(),
      userId,
      reportId,
    });

    // Fetch the message with author details
    const messages = await findMessagesByReportId(reportId);
    const message = messages.find((msg) => msg.id === createdMessage.id);

    return message || createdMessage;
  }
}

