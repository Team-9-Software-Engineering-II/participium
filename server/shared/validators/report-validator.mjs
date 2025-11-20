/**
 * Validates the payload for creating a report.
 * Responds with 400 when validation fails and returns the sanitized payload otherwise.
 * @param {import("express").Request} req - Incoming request containing report data.
 * @param {import("express").Response} res - Response used to send validation errors.
 * @returns {object | null} Sanitized payload or null when the response has been sent.
 */
export function validateCreateReportInput(req, res) {
  const {
    title,
    description,
    categoryId,
    latitude,
    longitude,
    anonymous = false,
    photos,
  } = req.body ?? {};

  const errors = [];

  if (!title || typeof title !== "string" || !title.trim()) {
    errors.push("Title is required.");
  }

  if (!description || typeof description !== "string" || !description.trim()) {
    errors.push("Description is required.");
  }

  const parsedCategoryId = Number(categoryId);
  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    errors.push("Valid categoryId is required.");
  }

  const parsedLatitude = Number(latitude);
  if (
    Number.isNaN(parsedLatitude) ||
    parsedLatitude < -90 ||
    parsedLatitude > 90
  ) {
    errors.push("Latitude must be a number between -90 and 90.");
  }

  const parsedLongitude = Number(longitude);
  if (
    Number.isNaN(parsedLongitude) ||
    parsedLongitude < -180 ||
    parsedLongitude > 180
  ) {
    errors.push("Longitude must be a number between -180 and 180.");
  }

  if (!Array.isArray(photos)) {
    errors.push("Photos must be an array.");
  } else {
    if (photos.length < 1 || photos.length > 3) {
      errors.push("Photos array must contain between 1 and 3 items.");
    }

    const invalidPhotos = photos.some(
      (photo) => typeof photo !== "string" || !photo.trim()
    );
    if (invalidPhotos) {
      errors.push("Each photo must be a non-empty string.");
    }
  }

  if (typeof anonymous !== "boolean") {
    errors.push("Anonymous must be a boolean value.");
  }

  if (errors.length > 0) {
    res.status(400).json({ message: "Invalid report payload.", errors });
    return null;
  }

  return {
    title: title.trim(),
    description: description.trim(),
    categoryId: parsedCategoryId,
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    anonymous,
    photos,
  };
}


