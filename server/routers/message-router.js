import { Router } from "express";
import { isAuthenticated, isReportParticipant } from "../middlewares/auth.mjs";
import { createMessage } from "../controllers/message-controller.js";

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

export default router;

