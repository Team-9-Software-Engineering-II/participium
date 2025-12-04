import { Router } from "express";
import { isAuthenticated, isAdmin, isTechnicalStaff } from "../middlewares/auth.mjs";
import { getAllTechnicalOffices } from "../controllers/technical-office-controller.mjs";
import { getMyAssignedReports, updateReportStatus, assignReportToExternalMaintainer, getEligibleCompanies } from "../controllers/report-controller.js";

const router = Router();

/**
 * Retrieve all technical offices stored in the system, with minimal information (id, name)
 */
router.get("/", isAuthenticated, isAdmin, getAllTechnicalOffices);

/**
 * Retrieve reports assigned to the logged-in technical staff member.
 * Route: GET /staff/reports/assigned
 */
router.get(
  "/reports/assigned",
  isAuthenticated,
  isTechnicalStaff,
  getMyAssignedReports
);

/**
 * Update status of an assigned report.
 * Route: PUT /offices/reports/:reportId/status
 */
router.put(
  "/reports/:reportId/status",
  isAuthenticated,
  isTechnicalStaff,
  updateReportStatus
);

/**
 * Assign a report to an external maintainer from a company.
 * Route: PUT /offices/reports/:reportId/assign-external
 */
router.put(
  "/reports/:reportId/assign-external",
  isAuthenticated,
  isTechnicalStaff,
  assignReportToExternalMaintainer
);

/**
 * Get eligible companies for a specific report.
 * Route: GET /offices/reports/:reportId/companies
 */
// <-- 2. NUOVA ROTTA
router.get(
  "/reports/:reportId/companies",
  isAuthenticated,
  isTechnicalStaff,
  getEligibleCompanies
);


export default router;
