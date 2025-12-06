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
      return res
        .status(400)
        .json({ message: "reportId must be a positive integer." });
    }

    const { action, rejectionReason } = req.body;

    if (action === "assigned") {
      // Chiama la logica di Load Balancing
      const updatedReport = await ReportService.acceptReport(reportId);
      return res.status(200).json(updatedReport);
    } else if (action === "rejected") {
      // Validazione base per il rifiuto
      if (!rejectionReason || rejectionReason.trim() === "") {
        return res.status(400).json({
          message: "Rejection reason is mandatory when rejecting a report.",
        });
      }

      const updatedReport = await ReportService.rejectReport(
        reportId,
        rejectionReason
      );
      return res.status(200).json(updatedReport);
    } else {
      return res.status(400).json({
        message: "Invalid action. Allowed values: 'assigned', 'rejected'.",
      });
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

/**
 * Returns reports assigned to the currently logged-in technical staff member.
 */
export async function getMyAssignedReports(req, res, next) {
  try {
    // L'ID dell'utente loggato è in req.user.id (grazie a passport/session)
    const officerId = req.user.id;

    const reports = await ReportService.getReportsAssignedToOfficer(officerId);
    return res.status(200).json(reports);
  } catch (error) {
    return next(error);
  }
}

/**
 * Allows technical staff or external maintainer to update the status of a report.
 * Restricted to specific status transitions.
 */
export async function updateReportStatus(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ message: "Invalid report ID." });
    }

    const { status } = req.body;

    // Definiamo gli stati permessi per il tecnico
    const allowedStatuses = ["In Progress", "Resolved", "Suspended"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed values: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }
    const reportToBeUpdated = await ReportService.getReportById(reportId);
    if (!reportToBeUpdated) {
      return res.status(404).json({
        message: `Report with ID ${reportId} not found`,
      });
    }
    const isReportManagedByCurrentAuthenticatedUser =
      await ReportService.isReportAssociatedToAuthenticatedUser(
        reportToBeUpdated,
        req.user.id
      );

    if (isReportManagedByCurrentAuthenticatedUser) {
      await ReportService.updateReport(reportId, {
        status,
      });
    } else {
      res.status(403).json({
        message: `You are not assigned to manage report with ID ${reportId}`,
      });
    }

    const freshReport = await ReportService.getReportById(reportId);

    return res.status(200).json(freshReport);
  } catch (error) {
    return next(error);
  }
}

/**
 * Allows technical staff to assign a report to an external maintainer from a company.
 * Uses load balancing to select the maintainer with the fewest active reports.
 */
export async function assignReportToExternalMaintainer(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res
        .status(400)
        .json({ message: "reportId must be a positive integer." });
    }

    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }

    const companyIdNumber = Number(companyId);
    if (!Number.isInteger(companyIdNumber) || companyIdNumber <= 0) {
      return res
        .status(400)
        .json({ message: "companyId must be a positive integer." });
    }

    const updatedReport = await ReportService.assignReportToExternalMaintainer(
      reportId,
      companyIdNumber
    );

    return res.status(200).json(updatedReport);
  } catch (error) {
    return next(error);
  }
}

/**
 * Returns the list of external maintainer companies capable of handling a specific report.
 */
export async function getEligibleCompanies(req, res, next) {
  try {
    const reportId = Number(req.params.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res
        .status(400)
        .json({ message: "reportId must be a positive integer." });
    }

    const companies = await ReportService.getEligibleCompaniesForReport(
      reportId
    );

    return res.status(200).json(companies);
  } catch (error) {
    return next(error);
  }
}
