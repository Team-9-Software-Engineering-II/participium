import {
  createReport,
  findAllReports,
  findReportById,
  findReportsByUserId,
  updateReport,
  findAllReportsFilteredByStatus,
  findReportsByTechnicalOfficerId,
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

    let address = null;
    if (payload.latitude && payload.longitude) {
      // Recuperiamo l'indirizzo in modo asincrono prima di salvare
      address = await this.#fetchAddressFromOSM(
        payload.latitude,
        payload.longitude
      );
    }

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
   * Retrieves reports assigned to a specific technical officer.
   * @param {number} officerId - The ID of the technical staff member.
   * @returns {Promise<object[]>} Sanitized list of assigned reports.
   */
  static async getReportsAssignedToOfficer(officerId) {
    const reports = await findReportsByTechnicalOfficerId(officerId);
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
   * Allow to check if a report is associated to the current autenticated user
   */
  static async isReportAssociatedToAuthenticatedUser(report, userId) {
    return (
      report.technicalOfficerId === userId ||
      report.externalMaintainerId === userId ||
      report.userId === userId
    );
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
        console.warn("OSM response not ok:", response.status);
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
      console.error("Error fetching address from OSM:", error);
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
      const error = new Error(`Company with id "${companyId}" not found.`);
      error.statusCode = 404;
      throw error;
    }

    // 3. Validate that the report is in a state that allows external assignment
    // Reports should be "Assigned" or "In Progress" to be assigned to external maintainers
    if (report.status === "Pending Approval" || report.status === "Rejected") {
      const error = new Error(
        `Cannot assign report to external maintainer. Current status is '${report.status}'. Report must be 'Assigned' or 'In Progress'.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Find the external maintainer with the fewest active reports
    const bestMaintainer = await findExternalMaintainerWithFewestReports(
      companyId
    );

    if (!bestMaintainer) {
      const error = new Error(
        `No external maintainers found in company '${company.name}'.`
      );
      error.statusCode = 409;
      throw error;
    }

    // 5. Update the report: assign to the external maintainer
    await updateReport(reportId, {
      externalMaintainerId: bestMaintainer.id,
    });

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
      const error = new Error("Report not found.");
      error.statusCode = 404;
      throw error;
    }

    const companies = await findCompaniesByCategoryId(report.categoryId);

    return companies;
  }
}
