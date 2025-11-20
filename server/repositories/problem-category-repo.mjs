import db from "../models/index.mjs";

/**
 * Creates a new problem category.
 */
export async function createProblemCategory(categoryData) {
  return db.Category.create(categoryData);
}

/**
 * Finds all problems categories, including the managing office.
 */
export async function findAllProblemsCategories() {
  return db.Category.findAll({
    include: { model: db.TechnicalOffice, as: "technicalOffice" },
  });
}

/**
 * Finds a problem category by its ID, including the managing office.
 */
export async function findProblemCategoryById(id) {
  return db.Category.findByPk(id, {
    include: { model: db.TechnicalOffice, as: "technicalOffice" },
  });
}

/**
 * Finds a problem category by its name, including the managing office.
 */
export async function findProblemCategoryByName(name) {
  return db.Category.findOne({
    where: { name },
    include: { model: db.TechnicalOffice, as: "technicalOffice" },
  });
}

/**
 * Updates a problem category by its ID.
 */
export async function updateCategory(id, categoryData) {
  const [updatedRows] = await db.Category.update(categoryData, {
    where: { id },
  });
  return updatedRows > 0;
}

/**
 * Deletes a problem category by its ID.
 */
export async function deleteCategory(id) {
  const deletedRows = await db.Category.destroy({
    where: { id },
  });
  return deletedRows > 0;
}
