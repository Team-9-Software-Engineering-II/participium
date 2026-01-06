import { UserAdminService } from "../services/user-admin-service.mjs";
import {
  validateRegistrationInputForMunicipalOrStaffCreation,
} from "../shared/validators/user-registration-validator.mjs";
import { validateUserRoleUpdateInput } from "../shared/validators/user-role-update-validator.mjs";
import { AuthService } from "../services/auth-service.mjs";
import { isIdNumberAndPositive } from "../shared/validators/common-validator.mjs";

/**
 * Handles HTTP requests for creating a municipality user.
 */
export async function createMunicipalityUser(req, res, next) {
  try {
    const validatedInput = validateRegistrationInputForMunicipalOrStaffCreation(
      req,
      res
    );

    if (!validatedInput) {
      return;
    }
    const newUser = await AuthService.registerMunicipalOrStaffUser(
      validatedInput
    );
    return res.status(201).json(newUser);
  } catch (error) {
    // Catch any error during registration and pass it to the handler
    return next(error);
  }
}

/**
 * Handles HTTP requests for getting the list of users.
 */
export async function getAllUsers(req, res, next) {
  try {
    const users = await UserAdminService.getUsers();
    return res.status(200).json(users);
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles HTTP requests for updating user roles.
 */
export async function updateUserRoles(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    if (!isIdNumberAndPositive(userId) || userId <= 0) {
      return res.status(400).json({ message: "userId must be a positive integer." });
    }

    const validatedInput = validateUserRoleUpdateInput(req);
    const updatedUser = await UserAdminService.updateUserRoles(
      userId,
      validatedInput.roles
    );
    return res.status(200).json(updatedUser);
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles HTTP requests for deleting a municipality user.
 */
export async function deleteUser(req, res, next) {
  try {
    const userId = Number(req.params.userId);

    if (!isIdNumberAndPositive(userId) || userId <= 0) {
      return res.status(400).json({ message: "userId must be a positive integer." });
    }

    if (req.user && req.user.id === userId) {
      return res.status(403).json({ message: "You cannot delete your own account." });
    }

    await UserAdminService.deleteUser(userId);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}
