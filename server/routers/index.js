import { Router } from "express";
import authRouter from "./auth-router.js";

const router = Router();

/**
 * Mounts feature routers under their respective base paths.
 */
router.use("/auth", authRouter);

export default router;

