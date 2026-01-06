import { isIdNumberAndPositive } from "./common-validator.mjs";
import AppError from "../utils/app-error.mjs";

/**
 * Validates the payload for updating user roles.
 * Accepts either an array of roleIds (legacy) or an array of role objects with associations.
 * @param {import("express").Request} req - Incoming request containing roles data.
 * @returns {object} Validated payload with roles array.
 * @throws {AppError} If validation fails.
 */
export function validateUserRoleUpdateInput(req) {
  const { roleIds, roles } = req.body ?? {};

  // Support legacy format (simple roleIds array)
  if (roleIds && !roles) {
    return validateLegacyFormat(roleIds);
  }

  // New format with role associations
  if (!Array.isArray(roles)) {
    throw new AppError("roles must be an array.", 400);
  }

  if (roles.length === 0) {
    throw new AppError("roles array cannot be empty. At least one role must be assigned.", 400);
  }

  const validatedRoles = [];
  const errors = [];
  const seenRoleCombinations = new Set();

  roles.forEach((role, index) => {
    if (!role || typeof role !== 'object') {
      errors.push(`Invalid role at index ${index}: must be an object.`);
      return;
    }

    const parsedRoleId = Number(role.roleId);
    if (!isIdNumberAndPositive(parsedRoleId) || parsedRoleId <= 0) {
      errors.push(`Invalid roleId at index ${index}: must be a positive integer.`);
      return;
    }

    // Build a unique key for this role combination
    // Format: "roleId:officeIds:companyId"
    const officeIds = role.technicalOfficeIds ? role.technicalOfficeIds.sort().join(',') : '';
    const companyId = role.companyId || '';
    const roleKey = `${parsedRoleId}:${officeIds}:${companyId}`;

    // Check for duplicates (same role with same associations)
    if (seenRoleCombinations.has(roleKey)) {
      errors.push(`Duplicate role combination at index ${index}: roleId ${parsedRoleId} with the same office/company already exists.`);
      return;
    }
    seenRoleCombinations.add(roleKey);

    const validatedRole = { roleId: parsedRoleId };

    // Validate technicalOfficeIds if present
    if (role.technicalOfficeIds) {
      if (!Array.isArray(role.technicalOfficeIds)) {
        errors.push(`technicalOfficeIds at index ${index} must be an array.`);
        return;
      }
      
      const validatedOfficeIds = [];
      role.technicalOfficeIds.forEach((officeId) => {
        const parsedOfficeId = Number(officeId);
        if (!isIdNumberAndPositive(parsedOfficeId) || parsedOfficeId <= 0) {
          errors.push(`Invalid technicalOfficeId in role at index ${index}.`);
        } else {
          validatedOfficeIds.push(parsedOfficeId);
        }
      });
      
      if (validatedOfficeIds.length > 0) {
        validatedRole.technicalOfficeIds = validatedOfficeIds;
      }
    }

    // Validate companyId if present
    if (role.companyId) {
      const parsedCompanyId = Number(role.companyId);
      if (!isIdNumberAndPositive(parsedCompanyId) || parsedCompanyId <= 0) {
        errors.push(`Invalid companyId at index ${index}: must be a positive integer.`);
      } else {
        validatedRole.companyId = parsedCompanyId;
      }
    }

    validatedRoles.push(validatedRole);
  });

  if (errors.length > 0) {
    throw new AppError(`Invalid roles: ${errors.join(" ")}`, 400);
  }

  return { roles: validatedRoles };
}

/**
 * Validates legacy format (simple roleIds array).
 * @param {number[]} roleIds - Array of role IDs.
 * @returns {object} Validated payload.
 * @throws {AppError} If validation fails.
 */
function validateLegacyFormat(roleIds) {
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

  // Convert to new format
  return {
    roles: uniqueRoleIds.map(roleId => ({ roleId })),
  };
}

