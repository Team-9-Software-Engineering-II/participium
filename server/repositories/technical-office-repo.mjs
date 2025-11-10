import db from "../models/index.mjs";

/**
 * Creates a new technical office.
 */
export async function createTechnicalOffice(officeData) {
  return db.TechnicalOffice.create(officeData);
}

/**
 * Finds all technical offices, including users and category.
 */
export async function findAllTechnicalOffices() {
  return db.TechnicalOffice.findAll({
    include: [
      { model: db.Category, as: "category", required: false },
      {
        model: db.User,
        as: "users",
        required: false,
        attributes: ["id", "username", "firstName", "lastName"],
      },
    ],
  });
}

/**
 * Finds a technical office by its ID, including users and category.
 */
export async function findTechnicalOfficeById(id) {
  return db.TechnicalOffice.findByPk(id, {
    include: [
      { model: db.Category, as: "category", required: false },
      {
        model: db.User,
        as: "users",
        required: false,
        attributes: ["id", "username", "firstName", "lastName"],
      },
    ],
  });
}

/**
 * Finds a technical office by its name, including users and category.
 */
export async function findTechnicalOfficeByName(name) {
  return db.TechnicalOffice.findOne({
    where: { name },
    include: [
      { model: db.Category, as: "category", required: false },
      {
        model: db.User,
        as: "users",
        required: false,
        attributes: ["id", "username", "firstName", "lastName"],
      },
    ],
  });
}

/**
 * Updates a technical office by its ID.
 */
export async function updateTechnicalOffice(id, officeData) {
  const [updatedRows] = await db.TechnicalOffice.update(officeData, {
    where: { id },
  });
  return updatedRows > 0;
}

/**
 * Deletes a technical office by its ID.
 */
export async function deleteTechnicalOffice(id) {
  const deletedRows = await db.TechnicalOffice.destroy({
    where: { id },
  });
  return deletedRows > 0;
}
