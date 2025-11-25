import { ReportService } from "../services/report-service.mjs";
import { REPORT } from "../shared/constants/models.mjs";
import { isIdNumberAndPositive } from "../shared/validators/common-validator.mjs";
import { findAllProblemsCategories } from "../repositories/problem-category-repo.mjs";

import {
  validateCreateReportInput,
  validateNewReportCategory,
  validateReportToBeAcceptedOrRejected,
} from "../shared/validators/report-validator.mjs";

/**
 * Handles HTTP requests for creating a new report.
 */
export async function createReport(req, res, next) {
  try {
    const payload = validateCreateReportInput(req, res);
    if (!payload) {
      return;
    }

    const report = await ReportService.createCitizenReport(
      req.user.id,
      payload
    );
    return res.status(201).json(report);
  } catch (error) {
    return next(error);
  }
}

/**
 * Returns every report stored in the system.
 */
export async function getAllReports(req, res, next) {
  try {
    const reports = await ReportService.getAllReports();
    return res.status(200).json(reports);
  } catch (error) {
    return next(error);
  }
}

/**
 * Returns every report in the Pending Approval status stored in the system.
 */
export async function getPendingApprovalReports(req, res, next) {
  try {
    const reports = await ReportService.getAllReportsFilteredByStatus(
      REPORT.STATUS.PENDING_APPROVAL,
      true
    );

    return res.status(200).json(reports);
  } catch (error) {
    return next(error);
  }
}

/**
 * Returns every report in the Assigned status stored in the system.
 */
export async function getAssignedReports(req, res, next) {
  try {
    const reports = await ReportService.getAllReportsFilteredByStatus(
      REPORT.STATUS.ASSIGNED,
      false
    );
    return res.status(200).json(reports);
  } catch (error) {
    return next(error);
  }
}

/**
 * Returns a single report identified by its id.
 */
export async function getReportById(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res
        .status(400)
        .json({ message: "reportId must be a positive integer." });
    }

    const report = await ReportService.getReportById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    return res.status(200).json(report);
  } catch (error) {
    return next(error);
  }
}

/**
 * Returns every report created by the selected user.
 */
export async function getReportsByUser(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res
        .status(400)
        .json({ message: "userId must be a positive integer." });
    }

    const reports = await ReportService.getReportsByUserId(userId);
    return res.status(200).json(reports);
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles report review (approval or rejection) by URP.
 * Route: PUT /urp/reports/:reportId/review
 */
export async function reviewReport(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "reportId must be a positive integer." });
    }

    const { action, rejectionReason } = req.body;

    if (action === "assigned") {
      // Chiama la logica di Load Balancing
      const updatedReport = await ReportService.acceptReport(reportId);
      return res.status(200).json(updatedReport);
    } 
    else if (action === "rejected") {
      // Validazione base per il rifiuto
      if (!rejectionReason || rejectionReason.trim() === "") {
        return res.status(400).json({ message: "Rejection reason is mandatory when rejecting a report." });
      }
      
      const updatedReport = await ReportService.rejectReport(reportId, rejectionReason);
      return res.status(200).json(updatedReport);
    } 
    else {
      return res.status(400).json({ message: "Invalid action. Allowed values: 'assigned', 'rejected'." });
    }

  } catch (error) {
    return next(error);
  }
}

/**
 * Gets all problem categories.
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await findAllProblemsCategories();
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

export async function changeProblemCategory(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    if (!isIdNumberAndPositive(reportId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    const validatedReportBody = await validateNewReportCategory(req.body);
    const updatedReport = await ReportService.updateReportCategory(
      reportId,
      validatedReportBody
    );
    return res.status(200).json({ success: updatedReport });
  } catch (error) {
    return next(error);
  }
}
