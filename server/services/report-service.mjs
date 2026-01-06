import {
  createReport,
  findAllReports,
  findReportById,
  findReportsByUserId,
  updateReport,
  findAllReportsFilteredByStatus,
  findReportsByTechnicalOfficerId,
  findReportsByExternalMaintainerId,
} from "../repositories/report-repo.mjs";
import { findProblemCategoryById } from "../repositories/problem-category-repo.mjs";
import {
  findStaffWithFewestReports,
  findExternalMaintainerWithFewestReports,
} from "../repositories/user-repo.mjs";
import {
  findCompanyById,
  findCompaniesByCategoryId,
} from "../repositories/company-repo.mjs";
import {
  sanitizeReport,
  sanitizeReports,
} from "../shared/utils/report-utils.mjs";
import { mapReportsCollectionToAssignedListDTO } from "../shared/dto/report-dto.mjs";
import { createNotification } from "../repositories/notification-repo.mjs";
import AppError from "../shared/utils/app-error.mjs";
import logger from "../shared/logging/logger.mjs";
/**
 * Encapsulates report business logic and orchestrates repository calls.
 */
export class ReportService {
  /**
   * Creates a new report for the provided user.
   * @param {number} userId - Identifier of the citizen opening the report.
   * @param {object} payload - Validated report data.
   * @returns {Promise<object>} Sanitized report.
   */
  static async createCitizenReport(userId, payload) {
    await this.#ensureCategoryExists(payload.categoryId);

    const address =
      payload.latitude && payload.longitude
        ? await this.#fetchAddressFromOSM(payload.latitude, payload.longitude)
        : null;

    const createdReport = await createReport({
      title: payload.title,
      description: payload.description,
      status: "Pending Approval",
      rejection_reason: null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      address,
      anonymous: payload.anonymous,
      photosLinks: payload.photos,
      userId,
      categoryId: payload.categoryId,
    });
    logger.info(
      `Report created successfully. ID: ${createdReport.id}, User: ${userId}, Category: ${payload.categoryId}`
    );
    const hydratedReport = await findReportById(createdReport.id);
    return sanitizeReport(hydratedReport ?? createdReport);
  }

  /**
   * Reviews a report, accepting it and assigning it to a technical officer.
   * @param {number} reportId - The ID of the report to accept.
   * @returns {Promise<object>} The updated sanitized report.
   */
  static async acceptReport(reportId) {
    // 1. Recupera il report e valida lo stato corrente
    const report = await findReportById(reportId);
    if (!report) {
      throw new AppError("Report not found.", 404);
    }

    if (report.status !== "Pending Approval") {
      throw new AppError(
        `Cannot accept report. Current status is '${report.status}', expected 'Pending Approval'.`,
        400
      );
    }

    // 2. Recupera la categoria per identificare l'Ufficio Tecnico competente
    const category = await findProblemCategoryById(report.categoryId);

    // (Nota: findProblemCategoryById include già il modello TechnicalOffice come 'technicalOffice')
    if (!category?.technicalOffice) {
      logger.error(
        `Configuration Error: Category ${report.categoryId} is not linked to any Technical Office.`
      );
      throw new Error(
        "Configuration Error: This report category is not linked to any Technical Office."
      );
    }

    const targetOfficeId = category.technicalOffice.id;

    // 3. Algoritmo di Load Balancing: Trova lo staff member con meno report
    const bestOfficer = await findStaffWithFewestReports(targetOfficeId);

    if (!bestOfficer) {
      logger.warn(
        `Accept Report Failed: No technical officers found in office '${category.technicalOffice.name}' (ID: ${targetOfficeId}).`
      );
      throw new AppError(
        `No technical officers found in the '${category.technicalOffice.name}' office.`,
        409
      );
    }

    // 4. Aggiorna il report: Stato "Assigned" e assegna all'ufficiale trovato
    await updateReport(reportId, {
      status: "Assigned",
      technicalOfficerId: bestOfficer.id, // <-- Usiamo il nome corretto definito nel model
    });

    logger.info(
      `Report ${reportId} accepted and assigned to Officer ${bestOfficer.username} (ID: ${bestOfficer.id}).`
    );
    // Ritorna il report aggiornato
    return this.getReportById(reportId);
  }

  /**
   * Rejects a report, providing a mandatory reason.
   * @param {number} reportId - The ID of the report to reject.
   * @param {string} rejectionReason - The reason for rejection.
   * @returns {Promise<object>} The updated sanitized report.
   */
  static async rejectReport(reportId, rejectionReason) {
    const report = await this.getReportById(reportId);

    // 2. Verifica lo stato (deve essere Pending Approval)
    if (report.status !== "Pending Approval") {
      throw new AppError(
        `Cannot reject report. Current status is '${report.status}', expected 'Pending Approval'.`,
        400
      );
    }

    // 3. Aggiorna il report: Stato "Rejected" e motivo del rifiuto
    await updateReport(reportId, {
      status: "Rejected",
      rejection_reason: rejectionReason,
    });

    logger.info(`Report ${reportId} rejected. Reason: "${rejectionReason}"`);
    // Ritorna il report aggiornato
    return this.getReportById(reportId);
  }

  /**
   * Retrieves reports assigned to a specific technical officer.
   * @param {number} officerId - The ID of the technical staff member.
   * @returns {Promise<object[]>} Sanitized list of assigned reports.
   */
  static async getReportsAssignedToOfficer(officerId) {
    const reports = await findReportsByTechnicalOfficerId(officerId);
    return sanitizeReports(reports);
  }

  /**
   * Retrieves reports assigned to an external maintainer.
   * @param {number} externalMaintainerId - The ID of the external maintainer.
   * @returns {Promise<object[]>} Sanitized reports collection.
   */
  static async getReportsByExternalMaintainer(externalMaintainerId) {
    const reports = await findReportsByExternalMaintainerId(
      externalMaintainerId
    );
    return sanitizeReports(reports);
  }

  /**
   * Retrieves all reports ordered by creation date.
   * @returns {Promise<object[]>} Sanitized reports collection.
   */
  static async getAllReports() {
    const reports = await findAllReports();
    return sanitizeReports(reports);
  }

  /**
   * @param {number} status - Strings that identify the status of the reports that you want to obtain
   * @param {Boolean} includeUser - Flag to indicates if including user details for each returned report
   *
   * Retrieves all reports in a certain status ordered by creation date. If includeUser is true, userDetails will be included in the response.
   * @returns {Promise<object[]>} Sanitized reports collection.
   */
  static async getAllReportsFilteredByStatus(status, includeUser = false) {
    const reports = await findAllReportsFilteredByStatus(status);
    return mapReportsCollectionToAssignedListDTO(reports, includeUser);
  }

  /**
   * Retrieves a report by its identifier.
   * @param {number} reportId - Identifier of the report to retrieve.
   * @returns {Promise<object | null>} Sanitized report or null when not found.
   */
  static async getReportById(reportId) {
    const report = await findReportById(reportId);
    if (!report) {
      logger.warn(`Report with ID ${reportId} not found`);
      throw new AppError(`Report with ID ${reportId} not found`, 404);
    }
    return sanitizeReport(report);
  }

  static async updateReport(reportId, payload) {
    await this.#ensureReportExists(reportId);

    // If status is being updated, create a notification for the customer
    if (payload.status !== undefined) {
      await this.#createStatusChangeNotification(reportId, payload.status);
    }

    return await updateReport(reportId, payload);
  }

  static async updateReportCategory(reportId, payload) {
    await this.#ensureReportExists(reportId);
    await this.#ensureCategoryExists(payload.categoryId);
    return await updateReport(reportId, payload);
  }

  /**
   * Allow to check if a report is associated to the current autenticated user
   */
  static async isReportAssociatedToAuthenticatedUser(report, userId) {
    // Check both sanitized format (assignee.id) and raw format (technicalOfficerId)
    const isTechnicalOfficer =
      report.technicalOfficerId === userId ||
      report.assignee?.id === userId;
    const isExternalMaintainer =
      report.externalMaintainerId === userId ||
      report.externalMaintainer?.id === userId;
    const isOwner = report.userId === userId;

    return isTechnicalOfficer || isExternalMaintainer || isOwner;
  }

  /**
   * Retrieves the reports created by the selected user.
   * @param {number} userId - Identifier of the report owner.
   * @returns {Promise<object[]>} Sanitized reports collection.
   */
  static async getReportsByUserId(userId) {
    const reports = await findReportsByUserId(userId);
    return sanitizeReports(reports);
  }

  static async #ensureCategoryExists(categoryId) {
    const category = await findProblemCategoryById(categoryId);
    if (category) {
      return;
    }
    throw new AppError(`Category with id "${categoryId}" not found.`, 404);
  }

  static async #ensureReportExists(reportId) {
    await this.getReportById(reportId);
  }

  /**
   * Creates a notification for the customer when report status changes.
   * @param {number} reportId - The ID of the report.
   * @param {string} newStatus - The new status of the report.
   * @private
   */
  static async #createStatusChangeNotification(reportId, newStatus) {
    try {
      // Fetch the report to get the customer (userId) and report title
      const report = await findReportById(reportId);
      if (!report || !report.userId) {
        logger.warn(
          `Cannot create notification: Report ${reportId} not found or missing userId`
        );
        return;
      }

      // Map status to user-friendly notification messages
      const statusMessages = {
        "In Progress": {
          title: "Report in lavorazione",
          message: `La tua segnalazione "${report.title}" è stata messa in lavorazione.`,
        },
        Resolved: {
          title: "Report risolto",
          message: `La tua segnalazione "${report.title}" è stata risolta.`,
        },
        Suspended: {
          title: "Report sospeso",
          message: `La tua segnalazione "${report.title}" è stata sospesa temporaneamente.`,
        },
      };

      const notificationData = statusMessages[newStatus];
      if (!notificationData) {
        logger.warn(
          `No notification message defined for status: ${newStatus}`
        );
        return;
      }

      // Create the notification
      await createNotification({
        userId: report.userId,
        reportId: reportId,
        type: "REPORT_STATUS_CHANGE",
        title: notificationData.title,
        message: notificationData.message,
        isRead: false,
      });

      logger.info(
        `Notification created for user ${report.userId} regarding report ${reportId} status change to ${newStatus}`
      );
    } catch (error) {
      // Log error but don't fail the status update if notification creation fails
      logger.error(
        `Failed to create notification for report ${reportId} status change:`,
        error
      );
    }
  }

  /**
   * Helper method to perform Reverse Geocoding via OpenStreetMap
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<string|null>} Formatted address or null if failed
   */
  static async #fetchAddressFromOSM(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "User-Agent": "ParticipiumProject/1.0 (student-project)",
          },
        }
      );

      if (!response.ok) {
        logger.warn(
          `OSM response not ok: ${response.status} for coords [${lat}, ${lon}]`
        );
        return null;
      }

      const data = await response.json();

      const road =
        data.address?.road ||
        data.address?.pedestrian ||
        data.address?.street ||
        "";
      const houseNumber = data.address?.house_number || "";
      let formattedAddress = `${road} ${houseNumber}`.trim();

      if (!formattedAddress) {
        formattedAddress = data.name || data.display_name;
      }

      return formattedAddress || null;
    } catch (error) {
      logger.error(
        `Error fetching address from OSM for coords [${lat}, ${lon}]:`,
        error
      );
      return null;
    }
  }

  /**
   * Assigns a report to an external maintainer from a specific company.
   * Uses load balancing to select the maintainer with the fewest active reports.
   * @param {number} reportId - The ID of the report to assign.
   * @param {number} companyId - The ID of the company to assign the report to.
   * @returns {Promise<object>} The updated sanitized report.
   */
  static async assignReportToExternalMaintainer(reportId, companyId) {
    // 1. Validate that the report exists
    const report = await findReportById(reportId);
    if (!report) {
      const error = new Error("Report not found.");
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate that the company exists
    const company = await findCompanyById(companyId);
    if (!company) {
      throw new AppError(`Company with id "${companyId}" not found.`, 404);
    }

    // 3. Validate that the report is in a state that allows external assignment
    // Reports should be "Assigned" or "In Progress" to be assigned to external maintainers
    if (report.status === "Pending Approval" || report.status === "Rejected") {
      throw new AppError(
        `Cannot assign report to external maintainer. Current status is '${report.status}'. Report must be 'Assigned' or 'In Progress'.`,
        400
      );
    }

    // 4. Find the external maintainer with the fewest active reports
    const bestMaintainer = await findExternalMaintainerWithFewestReports(
      companyId
    );

    if (!bestMaintainer) {
      logger.warn(
        `External Assignment Failed: No maintainers found in company ${companyId} for Report ${reportId}.`
      );
      throw new AppError(
        `No external maintainers found in company '${company.name}'.`,
        409
      );
    }

    // 5. Update the report: assign to the external maintainer AND set the companyId
    await updateReport(reportId, {
      externalMaintainerId: bestMaintainer.id,
      companyId: companyId,
    });
    logger.info(
      `Report ${reportId} assigned to External Maintainer ${bestMaintainer.username} (ID: ${bestMaintainer.id}) of Company ${companyId}.`
    );
    // Return the updated report
    return this.getReportById(reportId);
  }

  /**
   * Retrieves the list of external maintainer companies capable of handling a specific report
   * based on the report's category.
   * @param {number} reportId - The ID of the report.
   * @returns {Promise<object[]>} List of eligible companies.
   */
  static async getEligibleCompaniesForReport(reportId) {
    const report = await findReportById(reportId);
    if (!report) {
      throw new AppError("Report not found.", 404);
    }

    const companies = await findCompaniesByCategoryId(report.categoryId);

    return companies;
  }
}
