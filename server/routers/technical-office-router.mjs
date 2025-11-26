import { Router } from "express";
import { isAuthenticated, isAdmin, isTechnicalStaff } from "../middlewares/auth.mjs";
import { getAllTechnicalOffices } from "../controllers/technical-office-controller.mjs";
import { getMyAssignedReports } from "../controllers/report-controller.js";

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

export default router;
