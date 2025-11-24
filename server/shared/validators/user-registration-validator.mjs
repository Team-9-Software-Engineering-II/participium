import { isIdNumberAndPositive } from "./common-validator.mjs";

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
    res.status(400).json({
      message:
        "Missing required fields: email, username, firstName, lastName, password.",
    });
    return null;
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

  if (
    !email ||
    !username ||
    !firstName ||
    !lastName ||
    !password ||
    !roleId ||
    !technicalOfficeId
  ) {
    res.status(400).json({
      message:
        "Missing required fields: email, username, firstName, lastName, password, roleId, technicalOfficeId.",
    });
    return null;
  }

  if (roleId !== undefined) {
    const parsedRoleId = Number(roleId);
    if (!isIdNumberAndPositive(parsedRoleId)) {
      res.status(400).json({
        message: "roleId must be a positive integer when provided.",
      });
      return null;
    }
  }

  return {
    email,
    username,
    firstName,
    lastName,
    password,
    roleId,
    technicalOfficeId,
  };
}
