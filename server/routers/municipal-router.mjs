import { Router } from "express";
import { getPendingApprovalReports } from "../controllers/report-controller.js";
import {
  isAuthenticated,
  isPublicRelationsOfficer,
} from "../middlewares/auth.mjs";

const router = Router();

router.get(
  "/reports/pending",
  isAuthenticated,
  isPublicRelationsOfficer,
  getPendingApprovalReports
);

export default router;
