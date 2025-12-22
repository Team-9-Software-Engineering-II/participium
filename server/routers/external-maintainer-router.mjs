import { Router } from "express";
import { isAuthenticated, isExternalMaintainer } from "../middlewares/auth.mjs";
import { updateReportStatus } from "../controllers/report-controller.js";
const router = Router();

/**
 * Update status of an assigned report.
 * Route: PUT /external-maintainer/reports/:reportId/status
 */
router.put(
  "/reports/:reportId/status",
  isAuthenticated,
  isExternalMaintainer,
  updateReportStatus
);

export default router;
