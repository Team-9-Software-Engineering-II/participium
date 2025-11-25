import { Router } from "express";
import {
  acceptOrRejectReport,
  changeProblemCategory,
  getPendingApprovalReports,
  reviewReport,
} from "../controllers/report-controller.js";
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

router.put(
  "/reports/:reportId",
  isAuthenticated,
  isPublicRelationsOfficer,
  acceptOrRejectReport
  reviewReport
);

router.put(
  "/reports/:reportId/category",
  isAuthenticated,
  isPublicRelationsOfficer,
  changeProblemCategory
);

export default router;
