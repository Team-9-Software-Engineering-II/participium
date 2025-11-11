import { UserAdminService } from "../services/user-admin-service.mjs";

/**
 * Handles HTTP requests for creating a municipality user.
 */
export async function createMunicipalityUser(req, res, next) {
  try {
    // Assumiamo che il body sia validato (o lo validiamo qui)
    const { email, username, password, firstName, lastName, roleName } = req.body;

    if (!email || !username || !password || !firstName || !lastName || !roleName) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newUser = await UserAdminService.createMunicipalityUser(req.body);
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
      return res.status(400).json({ message: "Missing required 'role' field." });
    }

    await UserAdminService.assignUserRole(Number(userId), role);
    return res.status(200).json({ message: "Role updated successfully." });
  } catch (error) {
    return next(error);
  }
}

/**
 * Handles HTTP requests for getting the list of municipality users.
 */
export async function getMunicipalityUsers(req, res, next) {
  try {
    const users = await UserAdminService.getMunicipalityUsers();
    return res.status(200).json(users);
  } catch (error) {
    return next(error);
  }
}