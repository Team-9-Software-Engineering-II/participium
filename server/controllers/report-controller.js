import { ReportService } from "../services/report-service.mjs";
import { REPORT } from "../shared/constants/models.mjs";
import {
  validateCreateReportInput,
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
      REPORT.STATUS.PENDING_APPROVAL
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
      REPORT.STATUS.ASSIGNED
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

export async function acceptOrRejectReport(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res
        .status(400)
        .json({ message: "reportId must be a positive integer." });
    }

    const validatedReport = validateReportToBeAcceptedOrRejected(req.body);
    const updatedReport = await ReportService.updateReport(
      reportId,
      validatedReport
    );
    return res.status(200).json(updatedReport);
  } catch (error) {
    return next(error);
  }
}
