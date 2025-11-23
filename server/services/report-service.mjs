import {
  createReport,
  findAllReports,
  findReportById,
  findReportsByUserId,
  findAllReportsFilteredByStatus,
  updateReport,
} from "../repositories/report-repo.mjs";
import { findProblemCategoryById } from "../repositories/problem-category-repo.mjs";
import {
  sanitizeReport,
  sanitizeReports,
} from "../shared/utils/report-utils.mjs";
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
