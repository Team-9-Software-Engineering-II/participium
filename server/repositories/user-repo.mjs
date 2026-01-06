import { Op } from "sequelize";
import db from "../models/index.mjs";

export async function createUser(userData) {
  return db.User.create(userData);
}

/**
 * Finds all users, including role, office (if present), and reports.
 */
export async function findAllUsers() {
  return db.User.findAll({
    include: [
      { model: db.Role, as: "roles" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffices",
        required: false,
        include: { model: db.Category, as: "category" },
      },
      {
        model: db.Company,
        as: "company",
        required: false,
      },
      { model: db.Report, as: "reports", required: false },
    ],
  });
}

/**
 * Finds a user by ID, including role, office (if present), and reports.
 */
export async function findUserById(id) {
  return db.User.findByPk(id, {
    include: [
      { model: db.Role, as: "roles" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffices",
        required: false,
        include: { model: db.Category, as: "category" },
      },
      { model: db.Report, as: "reports", required: false },
    ],
  });
}

/**
 * Finds a user by email, including role, office (if present), and reports.
 */
export async function findUserByEmail(email) {
  return db.User.findOne({
    where: { email },
    include: [
      { model: db.Role, as: "roles" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffices",
        required: false,
        include: { model: db.Category, as: "category" },
      },
      { model: db.Report, as: "reports", required: false },
    ],
  });
}

/**
 * Finds a user by username, including role, office (if present), and reports.
 */
export async function findUserByUsername(username) {
  return db.User.findOne({
    where: { username },
    include: [
      { model: db.Role, as: "roles" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffices",
        required: false,
        include: { model: db.Category, as: "category" },
      },
      { model: db.Report, as: "reports", required: false },
    ],
  });
}

/**
 * Finds all users belonging to a specific company.
 * Include role.
 * * @param {number} companyId - The ID of the company.
 * @returns {Promise<Array<object>>} A list of users.
 */
export async function findUsersByCompanyId(companyId) {
  return db.User.findAll({
    where: { companyId },
    include: [{ model: db.Role, as: "roles" }],
  });
}

/**
 * Updates a user by its ID.
 */
export async function updateUser(id, userData) {
  const [updatedRows] = await db.User.update(userData, {
    where: { id },
  });
  return updatedRows > 0;
}

/**
 * Deletes a user by its ID.
 */
export async function deleteUser(id) {
  const deletedRows = await db.User.destroy({
    where: { id },
  });
  return deletedRows > 0;
}

// --- 2. NEW FUNCTION FOR ASSIGNMENT ALGORITHM ---

/**
 * Finds the staff member of a specific office who has the fewest active reports.
 * "Active" means currently assigned, in progress, or suspended.
 * Excludes Resolved, Rejected, and Pending Approval reports from the workload count.
 * * Algorithm:
 * 1. Fetch all staff in the office.
 * 2. Include their active reports count.
 * 3. Sort by Count (ASC) -> Last Name (ASC) -> First Name (ASC).
 * * @param {number} technicalOfficeId - The ID of the office to search.
 * @returns {Promise<object|null>} The user with the lowest workload, or null if office is empty.
 */
export async function findStaffWithFewestReports(technicalOfficeId) {
  // Retrieve all users that belong to the specified technical office
  // Use the many-to-many relationship through user_technical_office table
  const staffMembers = await db.User.findAll({
    include: [
      {
        model: db.TechnicalOffice,
        as: "technicalOffices",
        where: {
          id: technicalOfficeId,
        },
        through: { attributes: [] }, // Exclude join table attributes
        required: true, // INNER JOIN: only users with this office
      },
      {
        model: db.Report,
        as: "assignedReports", // Use the alias defined in the model
        where: {
          // Count only reports that are still "active" (current workload)
          // Exclude closed or not yet assigned ones
          status: {
            [Op.notIn]: ["Resolved", "Rejected", "Pending Approval"],
          },
        },
        required: false, // LEFT JOIN: Important to include those with 0 reports!
        attributes: ["id"], // Optimization: only fetch IDs
      },
    ],
  });

  if (!staffMembers || staffMembers.length === 0) {
    return null;
  }

  // Perform sorting in JavaScript
  // More reliable and easier to test than complex SQL queries with GROUP BY
  staffMembers.sort((a, b) => {
    // Calculate workload (length of assignedReports array)
    const countA = a.assignedReports ? a.assignedReports.length : 0;
    const countB = b.assignedReports ? b.assignedReports.length : 0;

    // 1. Primary criterion: Number of reports (Ascending)
    // Those with fewer reports come first
    if (countA !== countB) {
      return countA - countB;
    }

    // 2. Tie-breaker: Alphabetical order by Last Name
    const lastNameComparison = a.lastName.localeCompare(b.lastName);
    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }

    // 3. Final tie-breaker: Alphabetical order by First Name
    return a.firstName.localeCompare(b.firstName);
  });

  // Return the winner (the first in the sorted list)
  return staffMembers[0];
}

/**
 * Finds the external maintainer of a specific company who has the fewest active reports.
 * "Active" means currently assigned, in progress, or suspended.
 * Excludes Resolved, Rejected, and Pending Approval reports from the workload count.
 * Algorithm:
 * 1. Fetch all external maintainers in the company.
 * 2. Include their active reports count.
 * 3. Sort by Count (ASC) -> Last Name (ASC) -> First Name (ASC).
 * @param {number} companyId - The ID of the company to search.
 * @returns {Promise<object|null>} The user with the lowest workload, or null if company has no external maintainers.
 */
export async function findExternalMaintainerWithFewestReports(companyId) {
  // Retrieve all users of the company with external_maintainer role
  const externalMaintainers = await db.User.findAll({
    where: {
      companyId,
    },
    include: [
      {
        model: db.Role,
        as: "roles",
        where: {
          name: "external_maintainer",
        },
        required: true,
      },
      {
        model: db.Report,
        as: "externalReports", // Use the alias defined in the model
        where: {
          // Count only reports that are still "active" (current workload)
          // Exclude closed or not yet assigned ones
          status: {
            [Op.notIn]: ["Resolved", "Rejected", "Pending Approval"],
          },
        },
        required: false, // LEFT JOIN: Important to include those with 0 reports!
        attributes: ["id"], // Optimization: only fetch IDs
      },
    ],
  });

  if (!externalMaintainers || externalMaintainers.length === 0) {
    return null;
  }

  // Perform sorting in JavaScript
  // More reliable and easier to test than complex SQL queries with GROUP BY
  externalMaintainers.sort((a, b) => {
    // Calculate workload (length of externalReports array)
    const countA = a.externalReports ? a.externalReports.length : 0;
    const countB = b.externalReports ? b.externalReports.length : 0;

    // 1. Primary criterion: Number of reports (Ascending)
    // Those with fewer reports come first
    if (countA !== countB) {
      return countA - countB;
    }

    // 2. Tie-breaker: Alphabetical order by Last Name
    const lastNameComparison = a.lastName.localeCompare(b.lastName);
    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }

    // 3. Final tie-breaker: Alphabetical order by First Name
    return a.firstName.localeCompare(b.firstName);
  });

  // Return the winner (the first in the sorted list)
  return externalMaintainers[0];
}
