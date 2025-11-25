import { Router } from "express";
import {
  createReport,
  getAllReports,
  getAssignedReports,
  getReportById,
  getReportsByUser,
  getCategories
} from "../controllers/report-controller.js";
import { isAuthenticated, isCitizen } from "../middlewares/auth.mjs";

const router = Router();

/**
 * Citizen report creation endpoint.
 */
router.post("/", isAuthenticated, isCitizen, createReport);

/**
 * Retrieves all reports created in the platform.
 * Public endpoint - no authentication required.
 */
router.get("/", getAllReports);

/**
 * Retrieves every report created by a specific user.
 * This route MUST stay before the /:reportId definition to avoid conflicts.
 */
router.get("/user/:userId", isAuthenticated, getReportsByUser);

/**
 * Retrieves every report in the Assigned status.
 * This route MUST stay before the /:reportId definition to avoid conflicts.
 */
router.get("/assigned", isAuthenticated, isCitizen, getAssignedReports);

/**
 * Retrieves all problem categories.
 * Prrivate endpoint - authentication not required.
 * This route MUST stay before the /:reportId definition to avoid conflicts.
 */
router.get("/categories", isAuthenticated, getCategories);

/**
 * Retrieves a single report by its identifier.
 * Public endpoint - no authentication required.
 */
router.get("/:reportId", getReportById);

export default router;
