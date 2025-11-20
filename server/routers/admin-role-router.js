import { Router } from "express";
import { getAssignableRoles } from "../controllers/role-controller.js";
import { isAdmin, isAuthenticated } from "../middlewares/auth.mjs";

const router = Router();

// GET /admin/roles
router.get("/", isAuthenticated, isAdmin, getAssignableRoles);

export default router;
