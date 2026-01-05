import { isIdNumberAndPositive } from "./common-validator.mjs";
import AppError from "../utils/app-error.mjs";

/**
 * Validates the payload for updating user roles.
 * @param {import("express").Request} req - Incoming request containing roleIds array.
 * @returns {object} Validated payload with array of roleIds.
 * @throws {AppError} If validation fails.
 */
export function validateUserRoleUpdateInput(req) {
  const { roleIds } = req.body ?? {};

  if (!Array.isArray(roleIds)) {
    throw new AppError("roleIds must be an array.", 400);
  }

  if (roleIds.length === 0) {
    throw new AppError("roleIds array cannot be empty. At least one role must be assigned.", 400);
  }

  const validatedRoleIds = [];
  const errors = [];

  roleIds.forEach((roleId, index) => {
    const parsedRoleId = Number(roleId);
    if (!isIdNumberAndPositive(parsedRoleId) || parsedRoleId <= 0) {
      errors.push(`Invalid roleId at index ${index}: must be a positive integer.`);
    } else {
      validatedRoleIds.push(parsedRoleId);
    }
  });

  // Check for duplicates
  const uniqueRoleIds = [...new Set(validatedRoleIds)];
  if (uniqueRoleIds.length !== validatedRoleIds.length) {
    errors.push("roleIds array contains duplicate values.");
  }

  if (errors.length > 0) {
    throw new AppError(`Invalid roleIds: ${errors.join(" ")}`, 400);
  }

  return {
    roleIds: uniqueRoleIds,
  };
}

