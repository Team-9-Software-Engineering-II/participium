import { Router } from "express";
import authRouter from "./auth-router.js";
import userRouter from "./user-router.js";
import adminUserRouter from "./admin-user-router.js";
import adminRoleRouter from "./admin-role-router.js";
import reportRouter from "./report-router.js";
import uploadRouter from "./upload-router.js";

const router = Router();

/**
 * Mounts feature routers under their respective base paths.
 */
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/reports", reportRouter);
router.use("/upload", uploadRouter);
router.use("/admin/users", adminUserRouter);
router.use("/admin/roles", adminRoleRouter);
export default router;

