import { findAllCompanies } from "../repositories/company-repo.mjs";

/**
 * Handles HTTP requests for getting all companies.
 */
export async function getAllCompanies(req, res, next) {
  try {
    const companies = await findAllCompanies();
    return res.status(200).json(companies);
  } catch (error) {
    return next(error);
  }
}
