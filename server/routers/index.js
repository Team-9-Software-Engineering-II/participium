import { Router } from "express";
import authRouter from "./auth-router.js";
import userRouter from "./user-router.js";
import adminUserRouter from "./admin-user-router.js";
import adminRoleRouter from "./admin-role-router.js";
import adminCompanyRouter from "./admin-company-router.mjs";
import reportRouter from "./report-router.js";
import uploadRouter from "./upload-router.js";
import municipalRouter from "./municipal-router.mjs";
import techOfficeRouter from "./technical-office-router.mjs";
import externalMaintainerRouter from "./external-maintainer-router.mjs";
import messageRouter from "./message-router.js";
import notificationRouter from "./notification-router.js";

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
router.use("/admin/companies", adminCompanyRouter);
router.use("/municipal", municipalRouter);
router.use("/offices", techOfficeRouter);
router.use("/external-maintainer", externalMaintainerRouter);
router.use("/messages", messageRouter);
router.use("/notifications", notificationRouter);

export default router;
