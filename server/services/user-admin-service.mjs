import bcrypt from "bcrypt";
import {
  createUser,
  findAllUsers,
  findUserByEmail,
  findUserByUsername,
  updateUser,
} from "../repositories/user-repo.mjs";
import { findRoleByName } from "../repositories/role-repo.mjs";

const PASSWORD_SALT_ROUNDS = 10;

/**
 * Sanitizes a user object by removing sensitive data.
 * @param {object} user - The user object (Sequelize instance or plain object).
 * @returns {object} A plain user object without the hashed password.
 */
function _sanitizeUser(user) {
  const plainUser = user.get ? user.get({ plain: true }) : { ...user };
  delete plainUser.hashedPassword;
  return plainUser;
}

export class UserAdminService {
  /**
   * Creates a new municipality user.
   * Assumes roleName is provided and valid.
   */
  static async createMunicipalityUser(userData) {
    const { email, username, password, firstName, lastName, roleName } = userData;

    // Check for existing users (come in auth-service)
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      const error = new Error("Email is already registered.");
      error.statusCode = 409; // Conflict
      throw error;
    }

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      const error = new Error("Username is already registered.");
      error.statusCode = 409; // Conflict
      throw error;
    }

    // Find the Role ID from its name
    const role = await findRoleByName(roleName);
    if (!role) {
      const error = new Error(`Role with name "${roleName}" not found.`);
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    // Create user
    const createdUser = await createUser({
      email,
      username,
      firstName,
      lastName,
      hashedPassword,
      roleId: role.id,
    });

    return _sanitizeUser(createdUser);
  }

  /**
   * Assigns a new role to a user by user ID and role name.
   */
  static async assignUserRole(userId, roleName) {
    // Find the Role ID from its name (logica dello Swagger)
    const role = await findRoleByName(roleName);
    if (!role) {
      const error = new Error(`Role with name "${roleName}" not found.`);
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // 2. Update the user with the new roleId
    const success = await updateUser(userId, { roleId: role.id });
    if (!success) {
      const error = new Error(`User with ID ${userId} not found or not updated.`);
      error.statusCode = 404; // Not Found
      throw error;
    }
    return success;
  }

  /**
   * Gets all municipality users (excluding citizens and admins).
   */
  static async getMunicipalityUsers() {
    const allUsers = await findAllUsers();

    /*const municipalityUsers = allUsers.filter((user) => {
      const roleName = user.role?.name;
      return (
        roleName &&
        roleName.toLowerCase() !== "citizen" &&
        roleName.toLowerCase() !== "admin"
      );
    });*/

    return allUsers.map(_sanitizeUser);
  }
}