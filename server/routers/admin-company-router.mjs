import { Router } from "express";
import { getAllCompanies } from "../controllers/company-admin-controller.mjs";
import { isAuthenticated, isAdmin } from "../middlewares/auth.mjs";

const router = Router();

/**
 * Allow an admin to get all companies.
 */
router.get("/", isAuthenticated, isAdmin, getAllCompanies);

export default router;
