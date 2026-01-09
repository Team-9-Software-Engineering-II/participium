import { isIdNumberAndPositive } from "./common-validator.mjs";
import logger from "../logging/logger.mjs";
import AppError from "../utils/app-error.mjs";

/**
 * Extracts and validates registration data from the request body.
 * If validation fails, it sends a 400 response and returns null.
 *
 * @param {object} req - The Express request object
 * @param {object} res - The Express response object
 * @returns {object|null} An object with validated data, or null if validation failed.
 */
export function validateRegistrationInput(req, res) {
  const { email, username, firstName, lastName, password } = req.body ?? {};

  if (!email || !username || !firstName || !lastName || !password) {
    logger.warn(
      "Missing required fields: email, username, firstName, lastName, password."
    );
    throw new AppError(
      "Missing required fields: email, username, firstName, lastName, password.",
      400
    );
  }

  return {
    email,
    username,
    firstName,
    lastName,
    password,
  };
}

/**
 * Extracts and validates registration data from the request body for the registration of municipal or staff member users.
 * If validation fails, it sends a 400 response and returns null.
 *
 * @param {object} req - The Express request object
 * @param {object} res - The Express response object
 * @returns {object|null} An object with validated data, or null if validation failed.
 */
export function validateRegistrationInputForMunicipalOrStaffCreation(req, res) {
  const {
    email,
    username,
    firstName,
    lastName,
    password,
    roleId,
    technicalOfficeId,
  } = req.body ?? {};

  if (!email || !username || !firstName || !lastName || !password || !roleId) {
    logger.warn(
      "Missing required fields: email, username, firstName, lastName, password, roleId, technicalOfficeId."
    );
    throw new AppError(
      "Missing required fields: email, username, firstName, lastName, password, roleId, technicalOfficeId.",
      400
    );
  }

  if (roleId !== undefined) {
    const parsedRoleId = Number(roleId);
    if (!isIdNumberAndPositive(parsedRoleId)) {
      logger.warn("roleId must be a positive integer when provided.");
      throw new AppError(
        "roleId must be a positive integer when provided.",
        400
      );
    }
  }

  // Validazione opzionale del technicalOfficeId se presente
  if (technicalOfficeId != null && technicalOfficeId !== "") {
    const parsedTechId = Number(technicalOfficeId);
    if (!isIdNumberAndPositive(parsedTechId)) {
      logger.warn(
        "technicalOfficeId must be a positive integer when provided."
      );
      throw new AppError(
        "technicalOfficeId must be a positive integer when provided.",
        400
      );
    }
  }

  return {
    email,
    username,
    firstName,
    lastName,
    password,
    roleId,
    technicalOfficeId: technicalOfficeId || null,
  };
}
