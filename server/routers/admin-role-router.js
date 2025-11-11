import { Router } from "express";
import { getAssignableRoles } from "../controllers/role-controller.js";

const router = Router();

// GET /admin/roles
router.get("/", getAssignableRoles);

export default router;