import { REPORT } from "../constants/models.mjs";
import { isIdNumberAndPositive } from "./common-validator.mjs";

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

/**
 * Validates the data structure for updating a Report.
 * Checks specifically if the provided 'status' is one of the valid ENUM values.
 * @param {object} data - L'oggetto contenente i dati da aggiornare (può contenere 'status').
 * @returns {object} L'oggetto contenente solo i dati validati.
 * @throws {Error} Con un messaggio e statusCode 400 se i dati non sono validi.
 */
export function validateReportToBeAcceptedOrRejected(data) {
  const validatedReport = {
    status: undefined,
    rejection_reason: undefined,
  };

  if (data.status !== undefined && typeof data.status !== "string") {
    const error = new Error(`Status do not provided. Please, provide one.`);
    error.statusCode = 400;
    throw error;
  }

  if (
    data.status !== REPORT.STATUS.ASSIGNED &&
    data.status !== REPORT.STATUS.REJECTED
  ) {
    const error = new Error(
      `Invalid status provided. Status must be one among ${REPORT.STATUS.ASSIGNED} and ${REPORT.STATUS.REJECTED}`
    );
    error.statusCode = 400;
    throw error;
  }

  validatedReport.status = data.status;

  if (validatedReport.status === REPORT.STATUS.REJECTED) {
    if (
      data.rejection_reason === undefined ||
      typeof data.rejection_reason !== "string" ||
      data.rejection_reason.trim() === ""
    ) {
      const error = new Error("Please provide a rejection reason.");
      error.statusCode = 400;
      throw error;
    }
    validatedReport.rejection_reason = data.rejection_reason;
  }

  if (
    validatedReport.status === REPORT.STATUS.ASSIGNED &&
    data.rejection_reason !== undefined
  ) {
    const error = new Error(
      "Cannot provide a rejection reason for an Assigned report"
    );
    error.statusCode = 400;
    throw error;
  }

  return validatedReport;
}

export async function validateNewReportCategory(data) {
  const validatedData = {
    categoryId: null,
  };

  if (
    data.categoryId !== undefined &&
    typeof data.categoryId != Number &&
    data.categoryId === null
  ) {
    const error = new Error("Category id must be a number.");
    error.statusCode = 400;
    throw error;
  }
  if (!isIdNumberAndPositive(data.categoryId)) {
    const error = new Error("Invalid ID format");
    error.statusCode = 400;
    throw error;
  }
  validatedData.categoryId = data.categoryId;
  return validatedData;
}
