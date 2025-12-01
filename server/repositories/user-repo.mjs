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
      { model: db.Role, as: "role" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffice",
        required: false,
        include: { model: db.Category, as: "category" },
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
      { model: db.Role, as: "role" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffice",
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
      { model: db.Role, as: "role" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffice",
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
      { model: db.Role, as: "role" },
      {
        model: db.TechnicalOffice,
        as: "technicalOffice",
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
    include: [{ model: db.Role, as: "role" }],
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

// --- 2. NUOVA FUNZIONE PER L'ALGORITMO DI ASSEGNAZIONE ---

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
  // Recupera tutti gli utenti dell'ufficio tecnico specificato
  const staffMembers = await db.User.findAll({
    where: {
      technicalOfficeId,
    },
    include: [
      {
        model: db.Report,
        as: "assignedReports", // Usiamo l'alias definito nel model
        where: {
          // Contiamo solo i report che sono ancora "attivi" (carico di lavoro corrente)
          // Escludiamo quelli chiusi o non ancora assegnati
          status: {
            [Op.notIn]: ["Resolved", "Rejected", "Pending Approval"],
          },
        },
        required: false, // LEFT JOIN: Importante per includere anche chi ha 0 report!
        attributes: ["id"], // Ottimizzazione: scarichiamo solo gli ID
      },
    ],
  });

  if (!staffMembers || staffMembers.length === 0) {
    return null;
  }

  // Eseguiamo l'ordinamento (Sorting) in JavaScript
  // È più affidabile e facile da testare rispetto a query SQL complesse con GROUP BY
  staffMembers.sort((a, b) => {
    // Calcoliamo il carico di lavoro (lunghezza dell'array assignedReports)
    const countA = a.assignedReports ? a.assignedReports.length : 0;
    const countB = b.assignedReports ? b.assignedReports.length : 0;

    // 1. Criterio principale: Numero di report (Crescente)
    // Chi ha meno report viene prima
    if (countA !== countB) {
      return countA - countB;
    }

    // 2. Spareggio: Ordine alfabetico per Cognome
    const lastNameComparison = a.lastName.localeCompare(b.lastName);
    if (lastNameComparison !== 0) {
      return lastNameComparison;
    }

    // 3. Spareggio finale: Ordine alfabetico per Nome
    return a.firstName.localeCompare(b.firstName);
  });

  // Restituisce il vincitore (il primo della lista ordinata)
  return staffMembers[0];
}
