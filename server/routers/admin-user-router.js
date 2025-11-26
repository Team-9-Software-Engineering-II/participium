import { Router } from "express";
import {
  createMunicipalityUser,
  getAllUsers,
} from "../controllers/user-admin-controller.js";
import { isAdmin, isAuthenticated } from "../middlewares/auth.mjs";

const router = Router();

// middlewares

/**
 * Allow an admin to get ALL users.
 */
router.get("/", isAuthenticated, isAdmin, getAllUsers);

/**
 * Allow an admin to create a municipality user
 */
router.post("/", isAuthenticated, isAdmin, createMunicipalityUser);


export default router;
