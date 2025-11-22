/**
 * @typedef {object} AssignedReportDTO
 * @property {number} id
 * @property {string} title
 * @property {string} description
 * @property {string} status
 * @property {number} latitude
 * @property {number} longitude
 * @property {boolean} anonymous
 * @property {Array<string>} photos
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {object} category
 * @property {string | null} reporterName
 * @property {string | null} rejectionReason
 */

import { mapUserToPublicDTO } from "./user-dto.mjs";

/**
 * Map a single Report to an AssignedReport data transfer object, removing sensible data.
 * It removes references to userId and user details.
 *
 * @param {object} report - Sequelize Report object
 * @param {Boolean} includeUser - Flag to indicates if including user details for the report
 * @returns {AssignedReportDTO}
 */
export function mapReportToAssignedListDTO(report, includeUser = false) {
  if (!report) return null;

  const plainReport = report.get ? report.get({ plain: true }) : report;

  const dto = {
    id: plainReport.id,
    title: plainReport.title,
    description: plainReport.description,
    status: plainReport.status,
    latitude: plainReport.latitude,
    longitude: plainReport.longitude,
    anonymous: plainReport.anonymous,
    createdAt: plainReport.createdAt,
    updatedAt: plainReport.updatedAt,
    categoryId: plainReport.categoryId,
    category: plainReport.category,
    photos: plainReport.photosLinks || [],
    reporterName: getReporterName(plainReport),
    rejectionReason: plainReport.rejection_reason,
  };

  if (includeUser) {
    dto.userId = plainReport.userId;
    dto.user = plainReport.user;
  }
  return dto;
}

/**
 * Map a collection of Report objects in an AssignedReport DTO.
 *
 * @param {object[]} reports
 * @param {Boolean} includeUser - Flag to indicates if including user details for the report
 * @returns {AssignedReportDTO[]}
 */
export function mapReportsCollectionToAssignedListDTO(
  reports,
  includeUser = false
) {
  if (!Array.isArray(reports)) {
    return [];
  }
  return reports.map((report) =>
    mapReportToAssignedListDTO(report, includeUser)
  );
}

/**
 * This method aims to set the reporter name if it is the user do not want the report to be anonymous,
 * or set the reporterName as anonymous
 */
function getReporterName(report) {
  const fullName =
    report.user?.firstName && report.user?.lastName
      ? `${report.user.firstName} ${report.user.lastName}`
      : report.user?.username;
  return report.anonymous ? "Anonymous" : fullName ?? null;
}
