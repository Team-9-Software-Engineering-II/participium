import {
  createMessage,
  findMessagesByReportId,
} from "../repositories/message-repo.mjs";
import { findReportById } from "../repositories/report-repo.mjs";
import logger from "../shared/logging/logger.mjs";
import AppError from "../shared/utils/app-error.mjs";
import { ReportService } from "./report-service.mjs";

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
    const report = await ReportService.getReportById(reportId);

    // Validate content is provided and not empty
    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      logger.warn("Message content is required and cannot be empty.");
      throw new AppError(
        "Message content is required and cannot be empty.",
        400
      );
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

  /**
   * Retrieves the internal message history for a specific report.
   * Enforces strict authorization rules.
   * * @param {number} reportId - The ID of the report.
   * @param {object} user - The authenticated user (from req.user).
   * @returns {Promise<Array>} List of messages.
   */
  static async getReportMessages(reportId, user) {
    // check if report exixts

    const report = await findReportById(reportId);
    if (!report) {
      logger.warn(`Report with ID ${reportId} not found`);
      throw new AppError(`Report with ID ${reportId} not found`, 404);
    }
    // check user authorization
    // user with role "citizen" cannot access internal messages
    const roles = user.roles || [];
    const isCitizen = roles.some(role => role.name === "citizen");
    if (isCitizen) {
      logger.warn("Unauthorized: Citizens cannot access internal messages.");
      throw new AppError(
        "Unauthorized: Citizens cannot access internal messages.",
        403
      );
    }

    const isAdmin = roles.some(role => role.name === "admin");

    // checking the assigned officer and maintainer
    const isAssignedOfficer =
      report.technicalOfficerId && report.technicalOfficerId == user.id;
    const isAssignedMaintainer =
      report.externalMaintainerId && report.externalMaintainerId == user.id;

    // if not admin, not assigned officer and not assigned maintainer -> throw 403
    if (!isAdmin && !isAssignedOfficer && !isAssignedMaintainer) {
      logger.warn("Unauthorized: You are not assigned to this report.");
      throw new AppError(
        "Unauthorized: You are not assigned to this report.",
        403
      );
    }

    // fetch and return messages
    return await findMessagesByReportId(reportId);
  }
}
