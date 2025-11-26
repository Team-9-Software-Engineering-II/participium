import { TechnicalOfficeService } from "../services/technical-office-service.mjs";

/**
 * Handles HTTP requests for getting the list of simplified technical offices (id and name only).
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The Express next middleware function.
 */
export async function getAllTechnicalOffices(req, res, next) {
  try {
    const simplifiedOffices =
      await TechnicalOfficeService.getAllSimplifiedTechnicalOffices();
    return res.status(200).json(simplifiedOffices);
  } catch (error) {
    return next(error);
  }
}
