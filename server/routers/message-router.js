import { Router } from "express";
import { isAuthenticated, isReportParticipant } from "../middlewares/auth.mjs";
import { createMessage, getMessagesByReportId } from "../controllers/message-controller.js";

const router = Router();

/**
 * Create a new message for a report.
 * Route: POST /messages/reports/:reportId
 * Protected: User must be the technical officer or external maintainer assigned to the report.
 */
router.post(
  "/reports/:reportId",
  isAuthenticated,
  isReportParticipant,
  createMessage
);

/**
 * Get all messages for a specific report.
 * Route: GET /messages/reports/:reportId
 * Protected: Checks are handled internally by the Service to strictly filter data.
 */
router.get(
  "/reports/:reportId",
  isAuthenticated, // Basta questo, il Service fa il controllo di "ownership"
  getMessagesByReportId
);

export default router;

