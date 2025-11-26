/**
 * Extracts and validates profile update data from the request body.
 * If validation fails, it sends a 400 response and returns null.
 *
 * @param {object} req - The Express request object
 * @param {object} res - The Express response object
 * @returns {object|null} An object with validated data, or null if validation failed.
 */
export function validateProfileUpdateInput(req, res) {
  const {
    photoUrl,
    telegramUsername,
    emailNotificationsEnabled,
  } = req.body ?? {};

  const updates = {};

  if (photoUrl !== undefined) {
    if (typeof photoUrl !== "string" || photoUrl.trim() === "") {
      res.status(400).json({
        message: "photoUrl must be a non-empty string when provided.",
      });
      return null;
    }
    updates.photoUrl = photoUrl.trim();
  }

  if (telegramUsername !== undefined) {
    if (telegramUsername !== null && (typeof telegramUsername !== "string" || telegramUsername.trim() === "")) {
      res.status(400).json({
        message: "telegramUsername must be a non-empty string or null when provided.",
      });
      return null;
    }
    updates.telegramUsername = telegramUsername === null ? null : telegramUsername.trim();
  }

  if (emailNotificationsEnabled !== undefined) {
    if (typeof emailNotificationsEnabled !== "boolean") {
      res.status(400).json({
        message: "emailNotificationsEnabled must be a boolean when provided.",
      });
      return null;
    }
    updates.emailNotificationsEnabled = emailNotificationsEnabled;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({
      message: "At least one field must be provided for update: photoUrl, telegramUsername, emailNotificationsEnabled.",
    });
    return null;
  }

  return updates;
}

