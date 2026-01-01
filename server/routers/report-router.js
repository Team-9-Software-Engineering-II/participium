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
 * This route MUST stay before the /:reportId definition to avoid conflicts.
 */
router.get("/categories", getCategories);

/**
 * Retrieves a single report by its identifier.
 */
router.get("/:reportId", getReportById);

export default router;
