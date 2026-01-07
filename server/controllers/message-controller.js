import { MessageService } from "../services/message-service.mjs";

/**
 * Handles HTTP requests for creating a new message for a report.
 */
export async function createMessage(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    const userId = req.user.id;
    const { content, internal } = req.body;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res
        .status(400)
        .json({ message: "reportId must be a positive integer." });
    }

    if (!content) {
      return res.status(400).json({ message: "content is required." });
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "content cannot be empty." });
    }

    const message = await MessageService.createMessage(
      userId,
      reportId,
      content,
      internal
    );

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves all messages for a specific report.
 * Access is restricted by the service based on user role and assignment.
 */
export async function getMessagesByReportId(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    const internal = req.query.internal !== "false";
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res
        .status(400)
        .json({ message: "reportId must be a positive integer." });
    }

    // call service
    const messages = await MessageService.getReportMessages(
      reportId,
      req.user,
      internal
    );

    // response
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
}
