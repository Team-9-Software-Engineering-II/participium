import { Router } from "express";
import {
  acceptOrRejectReport,
  changeProblemCategory,
  getPendingApprovalReports,
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
);

router.put(
  "/reports/:reportId/category",
  isAuthenticated,
  isPublicRelationsOfficer,
  changeProblemCategory
);

export default router;
