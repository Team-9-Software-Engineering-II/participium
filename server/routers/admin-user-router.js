import { Router } from "express";
import {
  createMunicipalityUser,
  getAllUsers,
  updateUserRoles,
  deleteUser,
  checkUserDeletion,
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

/**
 * Allow an admin to update user roles
 */
router.put("/:userId/roles", isAuthenticated, isAdmin, updateUserRoles);

/**
 * Allow an admin to check if a user can be deleted
 */
router.get("/:userId/deletion-check", isAuthenticated, isAdmin, checkUserDeletion);

/**
 * Allow an admin to delete a municipality user
 */
router.delete("/:userId", isAuthenticated, isAdmin, deleteUser);

export default router;
