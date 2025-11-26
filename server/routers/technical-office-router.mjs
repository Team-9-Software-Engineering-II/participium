import { Router } from "express";
import { isAuthenticated, isAdmin } from "../middlewares/auth.mjs";
import { getAllTechnicalOffices } from "../controllers/technical-office-controller.mjs";

const router = Router();

/**
 * Retrieve all technical offices stored in the system, with minimal information (id, name)
 */
router.get("/", isAuthenticated, isAdmin, getAllTechnicalOffices);

export default router;
