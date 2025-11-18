/**
 * Extracts and validates registration data from the request body.
 * If validation fails, it sends a 400 response and returns null.
 *
 * @param {object} req - The Express request object
 * @param {object} res - The Express response object
 * @returns {object|null} An object with validated data, or null if validation failed.
 */
export function validateRegistrationInput(req, res) {
  const {
    email,
    username,
    firstName,
    lastName,
    password,
    roleId: requestedRoleId,
  } = req.body ?? {};

  if (!email || !username || !firstName || !lastName || !password) {
    res.status(400).json({
      message:
        "Missing required fields: email, username, firstName, lastName, password.",
    });
    return null;
  }

  let roleId;
  if (requestedRoleId !== undefined) {
    const parsedRoleId = Number(requestedRoleId);
    if (!Number.isInteger(parsedRoleId) || parsedRoleId <= 0) {
      res.status(400).json({
        message: "roleId must be a positive integer when provided.",
      });
      return null;
    }
    roleId = parsedRoleId;
  }

  return {
    email,
    username,
    firstName,
    lastName,
    password,
    roleId,
  };
}
