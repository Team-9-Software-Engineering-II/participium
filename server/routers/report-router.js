import { Router } from "express";
import {
  createReport,
  getAllReports,
  getReportById,
  getReportsByUser,
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
router.get("/", isAuthenticated, getAllReports);

/**
 * Retrieves every report created by a specific user.
 * This route MUST stay before the /:reportId definition to avoid conflicts.
 */
router.get("/user/:userId", isAuthenticated, getReportsByUser);

/**
 * Retrieves a single report by its identifier.
 */
router.get("/:reportId", isAuthenticated, getReportById);

export default router;


