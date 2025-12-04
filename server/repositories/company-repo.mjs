import db from "../models/index.mjs";

/**
 * Creates a new company.
 */
export async function createCompany(companyData) {
  return db.Company.create(companyData);
}

/**
 * Finds all companies.
 */
export async function findAllCompanies() {
  return db.Company.findAll();
}

/**
 * Finds a company by ID, including category, and users.
 */
export async function findCompanyById(id) {
  return db.Company.findByPk(id, {
    include: [
      {
        model: db.User,
        as: "users",
      },
      {
        model: db.Category,
        as: "categories",
        through: { attributes: [] },
      },
    ],
  });
}

/**
 * Finds a company by its name.
 */
export async function findCompanyByName(name) {
  return db.Company.findOne({
    where: { name },
    include: [
      {
        model: db.User,
        as: "users",
      },
      {
        model: db.Category,
        as: "categories",
        through: { attributes: [] },
      },
    ],
  });
}

/**
 * Updates a company's details.
 */
export async function updateCompany(id, companyData) {
  const [updatedRows] = await db.Company.update(companyData, {
    where: { id },
  });
  return updatedRows > 0;
}

/**
 * Deletes a company by ID.
 */
export async function deleteCompany(id) {
  return db.Company.destroy({
    where: { id },
  });
}

/**
 * Adds a specific category to a company.
 * @param {number} companyId
 * @param {number} categoryId
 */
export async function addCategoryToCompany(companyId, categoryId) {
  const company = await db.Company.findByPk(companyId);
  if (!company) throw new Error("Company not found");

  return company.addCategory(categoryId);
}

/**
 * Removes a specific category from a company.
 * @param {number} companyId
 * @param {number} categoryId
 */
export async function removeCategoryFromCompany(companyId, categoryId) {
  const company = await db.Company.findByPk(companyId);
  if (!company) throw new Error("Company not found");

  return company.removeCategory(categoryId);
}

/**
 * Finds all companies associated with a specific category ID.
 */
export async function findCompaniesByCategoryId(categoryId) {
  return db.Company.findAll({
    include: [
      {
        model: db.Category,
        as: "categories",
        where: { id: categoryId },
        through: { attributes: [] },
      },
    ],
    order: [["name", "ASC"]],
  });
}
