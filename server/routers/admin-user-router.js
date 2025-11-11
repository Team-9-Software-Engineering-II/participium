import { Router } from "express";
import {
  createMunicipalityUser,
  assignUserRole,
  getMunicipalityUsers,
} from "../controllers/user-admin-controller.js";

const router = Router();

// middlewares

// GET /admin/users
router.get("/", getMunicipalityUsers);

// POST /admin/users
router.post("/", createMunicipalityUser);

// PUT /admin/users/:userId/role
router.put("/:userId/role", assignUserRole);

export default router;