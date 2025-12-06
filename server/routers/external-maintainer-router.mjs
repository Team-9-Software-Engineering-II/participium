import { Router } from "express";
import { isAuthenticated, isExternalMaintainer } from "../middlewares/auth.mjs";
import { updateReportStatus } from "../controllers/report-controller";

const router = Router();

/**
 * Update status of an assigned report.
 * Route: PUT /offices/reports/:reportId/status
 */
router.put(
  "/reports/:reportId/status",
  isAuthenticated,
  isExternalMaintainer,
  updateReportStatus
);

export default router;
