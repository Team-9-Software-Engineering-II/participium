import {
  createReport,
  findAllReports,
  findReportById,
  findReportsByUserId,
  updateReport,
  findAllReportsFilteredByStatus, // <-- Import del collega
} from "../repositories/report-repo.mjs";
import { findProblemCategoryById } from "../repositories/problem-category-repo.mjs";
import { findStaffWithFewestReports } from "../repositories/user-repo.mjs"; // <-- Tuo import
import {
  sanitizeReport,
  sanitizeReports,
} from "../shared/utils/report-utils.mjs";
// Import del collega (assicurati che questo file esista ora nel tuo progetto!)
import { mapReportsCollectionToAssignedListDTO } from "../shared/dto/report-dto.mjs";
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

    const createdReport = await createReport({
      title: payload.title,
      description: payload.description,
      status: "Pending Approval",
      rejection_reason: null,
      latitude: payload.latitude,
      longitude: payload.longitude,
      anonymous: payload.anonymous,
      photosLinks: payload.photos,
      userId,
      categoryId: payload.categoryId,
    });

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
      const error = new Error("Report not found.");
      error.statusCode = 404;
      throw error;
    }

    if (report.status !== "Pending Approval") {
      const error = new Error(
        `Cannot accept report. Current status is '${report.status}', expected 'Pending Approval'.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Recupera la categoria per identificare l'Ufficio Tecnico competente
    const category = await findProblemCategoryById(report.categoryId);
    
    // (Nota: findProblemCategoryById include già il modello TechnicalOffice come 'technicalOffice')
    if (!category || !category.technicalOffice) {
      console.log(category);
      const error = new Error(
        "Configuration Error: This report category is not linked to any Technical Office."
      );
      error.statusCode = 500;
      throw error;
    }

    const targetOfficeId = category.technicalOffice.id;

    // 3. Algoritmo di Load Balancing: Trova lo staff member con meno report
    const bestOfficer = await findStaffWithFewestReports(targetOfficeId);

    if (!bestOfficer) {
      const error = new Error(
        `No technical officers found in the '${category.technicalOffice.name}' office.`
      );
      error.statusCode = 409;
      throw error;
    }

    // 4. Aggiorna il report: Stato "Assigned" e assegna all'ufficiale trovato
    await updateReport(reportId, {
      status: "Assigned",
      technicalOfficerId: bestOfficer.id, // <-- Usiamo il nome corretto definito nel model
    });

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
    // 1. Recupera il report
    const report = await findReportById(reportId);
    if (!report) {
      const error = new Error("Report not found.");
      error.statusCode = 404;
      throw error;
    }

    // 2. Verifica lo stato (deve essere Pending Approval)
    if (report.status !== "Pending Approval") {
      const error = new Error(
        `Cannot reject report. Current status is '${report.status}', expected 'Pending Approval'.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Aggiorna il report: Stato "Rejected" e motivo del rifiuto
    await updateReport(reportId, {
      status: "Rejected",
      rejection_reason: rejectionReason,
    });

    // Ritorna il report aggiornato
    return this.getReportById(reportId);
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
    return sanitizeReport(report);
  }

  static async updateReport(reportId, payload) {
    await this.#ensureReportExists(reportId);
    return await updateReport(reportId, payload);
  }

  static async updateReportCategory(reportId, payload) {
    await this.#ensureReportExists(reportId);
    await this.#ensureCategoryExists(payload.categoryId);
    return await updateReport(reportId, payload);
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
    const error = new Error(`Category with id "${categoryId}" not found.`);
    error.statusCode = 404;
    throw error;
  }

  static async #ensureReportExists(reportId) {
    const report = await findReportById(reportId);
    if (report) {
      return;
    }
    const error = new Error(`Report with id "${reportId}" not found.`);
    error.statusCode = 404;
    throw error;
  }
}
