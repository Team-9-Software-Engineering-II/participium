import { MessageService } from "../services/message-service.mjs";

/**
 * Handles HTTP requests for creating a new message for a report.
 */
export async function createMessage(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    const userId = req.user.id; // From passport session
    const { content } = req.body;

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "reportId must be a positive integer." });
    }

    if (!content) {
      return res.status(400).json({ message: "content is required." });
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ message: "content cannot be empty." });
    }

    const message = await MessageService.createMessage(userId, reportId, content);

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
}

