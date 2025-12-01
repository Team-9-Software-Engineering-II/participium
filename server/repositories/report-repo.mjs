import db from "../models/index.mjs";

/**
 * Creates a new report.
 */
export async function createReport(reportData) {
  return db.Report.create(reportData);
}

/**
 * Finds all reports, including  Reporter details, Category, Technical Officer and External Maintainer.
 */
export async function findAllReports() {
  return db.Report.findAll({
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "username", "firstName", "lastName", "photoURL"],
      },
      {
        model: db.Category,
        as: "category",
      },
      {
        model: db.User,
        as: "technicalOfficer",
        attributes: ["id", "username", "firstName", "lastName", "email"],
      },
      {
        model: db.User,
        as: "externalMaintainer",
        attributes: [
          "id",
          "username",
          "firstName",
          "lastName",
          "email",
          "companyId",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

/**
 * Finds all reports filtered by status, including  Reporter details, Category, Technical Officer and External Maintainer.
 */
export async function findAllReportsFilteredByStatus(status) {
  return db.Report.findAll({
    where: { status },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "username", "firstName", "lastName", "photoURL"],
      },
      {
        model: db.Category,
        as: "category",
      },
      {
        model: db.User,
        as: "technicalOfficer",
        attributes: ["id", "username", "firstName", "lastName", "email"],
      },
      {
        model: db.User,
        as: "externalMaintainer",
        attributes: [
          "id",
          "username",
          "firstName",
          "lastName",
          "email",
          "companyId",
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

/**
 * Finds a report by its ID, including User and Category.
 */
export async function findReportById(id) {
  return db.Report.findByPk(id, {
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "username", "firstName", "lastName", "photoURL"],
      },
      {
        model: db.Category,
        as: "category",
        include: [
          {
            model: db.TechnicalOffice,
            as: "technicalOffice",
            attributes: ["id", "name"],
          },
        ],
      },
      {
        model: db.User,
        as: "technicalOfficer",
        attributes: ["id", "username", "firstName", "lastName", "email"],
      },
      {
        model: db.User,
        as: "externalMaintainer",
        attributes: [
          "id",
          "username",
          "firstName",
          "lastName",
          "email",
          "companyId",
        ],
      },
    ],
  });
}

/**
 * Finds all reports created by a specific user.
 */
export async function findReportsByUserId(userId) {
  return db.Report.findAll({
    where: { userId },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "username", "firstName", "lastName", "photoURL"],
      },
      {
        model: db.Category,
        as: "category",
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

/**
 * Finds all reports belonging to a specific category.
 */
export async function findReportsByCategoryId(categoryId) {
  return db.Report.findAll({
    where: { categoryId },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "username", "firstName", "lastName", "photoURL"],
      },
      {
        model: db.Category,
        as: "category",
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}

/**
 * Updates a report by its ID.
 */
export async function updateReport(id, reportData) {
  const [updatedRows] = await db.Report.update(reportData, {
    where: { id },
  });
  return updatedRows > 0;
}

/**
 * Deletes a report by its ID.
 */
export async function deleteReport(id) {
  const deletedRows = await db.Report.destroy({
    where: { id },
  });
  return deletedRows > 0;
}

/**
 * Finds all reports assigned to a specific technical officer.
 */
export async function findReportsByTechnicalOfficerId(officerId) {
  return db.Report.findAll({
    where: {
      technicalOfficerId: officerId,
    },
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["id", "username", "firstName", "lastName", "photoURL"],
      },
      {
        model: db.Category,
        as: "category",
      },
    ],
    order: [["createdAt", "DESC"]],
  });
}
