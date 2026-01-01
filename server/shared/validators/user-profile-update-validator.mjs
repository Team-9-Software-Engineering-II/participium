import AppError from "../utils/app-error.mjs";

/**
 * Extracts and validates profile update data from the request body.
 * If validation fails, it sends a 400 response and returns null.
 *
 * @param {object} req - The Express request object
 * @param {object} res - The Express response object
 * @returns {object|null} An object with validated data, or null if validation failed.
 */
export function validateProfileUpdateInput(req) {
  const { photoUrl, telegramUsername, emailNotificationsEnabled } =
    req.body ?? {};

  const updates = {};

  if (photoUrl !== undefined) {
    if (typeof photoUrl !== "string" || photoUrl.trim() === "") {
      throw new AppError(
        "photoUrl must be a non-empty string when provided.",
        400
      );
    }
    updates.photoUrl = photoUrl.trim();
  }

  if (telegramUsername !== undefined) {
    if (
      telegramUsername !== null &&
      (typeof telegramUsername !== "string" || telegramUsername.trim() === "")
    ) {
      throw new AppError(
        "telegramUsername must be a non-empty string or null when provided.",
        400
      );
    }
    updates.telegramUsername =
      telegramUsername === null ? null : telegramUsername.trim();
  }

  if (emailNotificationsEnabled !== undefined) {
    if (typeof emailNotificationsEnabled !== "boolean") {
      throw new AppError(
        "emailNotificationsEnabled must be a boolean when provided.",
        400
      );
    }
    updates.emailNotificationsEnabled = emailNotificationsEnabled;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(
      "At least one field must be provided for update: photoUrl, telegramUsername, emailNotificationsEnabled.",
      400
    );
  }

  return updates;
}
