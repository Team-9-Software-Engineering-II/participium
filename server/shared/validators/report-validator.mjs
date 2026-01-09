import { REPORT } from "../constants/models.mjs";
import { isIdNumberAndPositive } from "./common-validator.mjs";
import AppError from "../utils/app-error.mjs";
/**
 * Validates the payload for creating a report.
 * Throws an AppError if validation fails, otherwise returns sanitized payload.
 * @param {import("express").Request} req - Incoming request containing report data.
 * @param {import("express").Response} res - Response used to send validation errors.
 * @returns {object | null} Sanitized payload or null when the response has been sent.
 */
export function validateCreateReportInput(req) {
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

  if (Array.isArray(photos)) {
    if (photos.length < 1 || photos.length > 3) {
      errors.push("Photos array must contain between 1 and 3 items.");
    }

    const invalidPhotos = photos.some(
      (photo) => typeof photo !== "string" || !photo.trim()
    );
    if (invalidPhotos) {
      errors.push("Each photo must be a non-empty string.");
    }
  } else {
    errors.push("Photos must be an array.");
  }

  if (typeof anonymous !== "boolean") {
    errors.push("Anonymous must be a boolean value.");
  }

  if (errors.length > 0) {
    const errorMessage = `Invalid report payload: ${errors.join(" ")}`;
    throw new AppError(errorMessage, 400);
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
    throw new AppError(`Status do not provided. Please, provide one.`, 400);
  }

  if (
    data.status !== REPORT.STATUS.ASSIGNED &&
    data.status !== REPORT.STATUS.REJECTED
  ) {
    throw new AppError(
      `Invalid status provided. Status must be one among ${REPORT.STATUS.ASSIGNED} and ${REPORT.STATUS.REJECTED}`,
      400
    );
  }

  validatedReport.status = data.status;

  if (validatedReport.status === REPORT.STATUS.REJECTED) {
    if (
      data.rejection_reason === undefined ||
      typeof data.rejection_reason !== "string" ||
      data.rejection_reason.trim() === ""
    ) {
      throw new AppError("Please provide a rejection reason.", 400);
    }
    validatedReport.rejection_reason = data.rejection_reason;
  }

  if (
    validatedReport.status === REPORT.STATUS.ASSIGNED &&
    data.rejection_reason !== undefined
  ) {
    throw new AppError(
      "Cannot provide a rejection reason for an Assigned report",
      400
    );
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
    throw new AppError("Category id must be a number.", 400);
  }
  if (!isIdNumberAndPositive(data.categoryId)) {
    throw new AppError("Invalid ID format", 400);
  }
  validatedData.categoryId = data.categoryId;
  return validatedData;
}
