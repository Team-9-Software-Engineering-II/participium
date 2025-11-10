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
