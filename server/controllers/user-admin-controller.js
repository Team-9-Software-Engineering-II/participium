import { UserAdminService } from "../services/user-admin-service.mjs";
import { validateRegistrationInput } from "../shared/validators/user-registration-validator.mjs";
import { AuthService } from "../services/auth-service.mjs";
/**
 * Handles HTTP requests for creating a municipality user.
 */
export async function createMunicipalityUser(req, res, next) {
  try {
    const validatedInput = validateRegistrationInput(req, res);

    if (!validatedInput) {
      return;
    }
    const newUser = await AuthService.registerUser(validatedInput);
    return res.status(201).json(newUser);
  } catch (error) {
    return next(error); // Passa all'error handler
  }
}

/**
 * Handles HTTP requests for assigning a role to a user.
 */
export async function assignUserRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = req.body; // Come da Swagger, il campo si chiama "role"

    if (!role) {
      return res
        .status(400)
        .json({ message: "Missing required 'role' field." });
    }

    await UserAdminService.assignUserRole(Number(userId), role);
    return res.status(200).json({ message: "Role updated successfully." });
  } catch (error) {
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
