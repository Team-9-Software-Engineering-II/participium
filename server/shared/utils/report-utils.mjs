/**
 * Converts a Sequelize report instance into a plain object and normalizes field names.
 * @param {import("sequelize").Model | null} report - Report instance returned by Sequelize.
 * @returns {object | null} Plain JavaScript object with normalized properties.
 */
export function sanitizeReport(report) {
  if (!report) {
    return null;
  }

  const plainReport = report.get ? report.get({ plain: true }) : { ...report };

  if (Array.isArray(plainReport.photosLinks)) {
    plainReport.photos = plainReport.photosLinks;
  } else if (typeof plainReport.photosLinks === "string") {
    try {
      plainReport.photos = JSON.parse(plainReport.photosLinks);
    } catch (error) {
      plainReport.photos = [];
    }
  } else if (plainReport.photosLinks == null) {
    plainReport.photos = [];
  }

  delete plainReport.photosLinks;

  const fullName =
    plainReport.user?.firstName && plainReport.user?.lastName
      ? `${plainReport.user.firstName} ${plainReport.user.lastName}`
      : plainReport.user?.username;
  plainReport.reporterName = plainReport.anonymous ? "Anonymous" : fullName ?? null;

  if (plainReport.rejection_reason !== undefined) {
    plainReport.rejectionReason = plainReport.rejection_reason;
    delete plainReport.rejection_reason;
  }

  return plainReport;
}

/**
 * Sanitizes a collection of Sequelize report instances.
 * @param {Array<import("sequelize").Model>} reports - List of Sequelize report instances.
 * @returns {object[]} Sanitized plain report objects.
 */
export function sanitizeReports(reports = []) {
  return reports.map((report) => sanitizeReport(report)).filter(Boolean);
}


