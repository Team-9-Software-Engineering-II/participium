import { UserAdminService } from "../services/user-admin-service.mjs";
import {
  validateRegistrationInput,
  validateRegistrationInputForMunicipalOrStaffCreation,
} from "../shared/validators/user-registration-validator.mjs";
import { AuthService } from "../services/auth-service.mjs";

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
