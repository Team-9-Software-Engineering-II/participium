import bcrypt from "bcrypt";
import {
  createUser,
  findUserByEmail,
  findUserById as findUserByIdRepo,
  findUserByUsername,
} from "../repositories/user-repo.mjs";
import { findRoleById } from "../repositories/role-repo.mjs";
import { findRoleByName } from "../repositories/role-repo.mjs"; // added for refactoring
import { findTechnicalOfficeById } from "../repositories/technical-office-repo.mjs";

const PASSWORD_SALT_ROUNDS = 10;

/**
 * Provides high level authentication operations that orchestrate repository calls.
 */
export class AuthService {
  /**
   * Registers a new user after validating uniqueness and hashing the password.
   * @param {object} userInput - Raw registration data from the client.
   * @returns {Promise<object>} A sanitized user representation without sensitive fields.
   */
  static async registerUser(userInput) {
    const { email, username, password, firstName, lastName } = userInput;

    this.#validateEmailFormat(email);

    await this.#ensureEmailAvailable(email);
    await this.#ensureUsernameAvailable(username);
    const defaultCitizenRole = await this.#assignCitizenRole();

    const hashedPassword = await this.#hashPassword(password);
    const createdUser = await createUser({
      email,
      username,
      firstName,
      lastName,
      hashedPassword,
      roleId: defaultCitizenRole,
    });

    const hydratedUser = await findUserByIdRepo(createdUser.id);
    return this.#sanitizeUser(hydratedUser ?? createdUser);
  }

  /**
   * Registers a new municipal/staff user after validating uniqueness and hashing the password.
   * @param {object} userInput - Raw registration data from the client.
   * @returns {Promise<object>} A sanitized user representation without sensitive fields.
   */
  static async registerMunicipalOrStaffUser(userInput) {
    const {
      email,
      username,
      password,
      firstName,
      lastName,
      roleId,
      technicalOfficeId,
    } = userInput;

    this.#validateEmailFormat(email);

    await this.#ensureEmailAvailable(email);
    await this.#ensureUsernameAvailable(username);
    await this.#ensureTechnicalOfficeExists(technicalOfficeId);
    const isRoleExisting = await this.#isRoleExsisting(roleId);
    if (!isRoleExisting) {
      const error = new Error(`Role with id ${roleId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const hashedPassword = await this.#hashPassword(password);
    const createdUser = await createUser({
      email,
      username,
      firstName,
      lastName,
      hashedPassword,
      roleId,
      technicalOfficeId,
    });

    const hydratedUser = await findUserByIdRepo(createdUser.id);
    return this.#sanitizeUser(hydratedUser ?? createdUser);
  }

  /** Validates the provided email format using a basic regex
   * @param {string} email - Email to validate.
   * @throws {Error} If the email format is invalid, with status 400.
   * @private
   */
  static #validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      const error = new Error("Invalid email format.");
      error.statusCode = 400; // <-- Error 400 Bad Request
      throw error;
    }
  }

  /**
   * Validates a username/password or email/password combination and returns the user if successful.
   * @param {string} username - Username provided by the client.
   * @param {string} password - Plain text password provided by the client.
   * @returns {Promise<object|null>} Sanitized user when credentials match, otherwise null.
   */
  static async validateCredentials(username, password) {
    const user =
      (await findUserByUsername(username)) || (await findUserByEmail(username));
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
      return null;
    }

    return this.#sanitizeUser(user);
  }

  /**
   * Retrieves a sanitized user entity by ID to restore user state from sessions.
   * @param {number} id - Identifier of the user to load.
   * @returns {Promise<object|null>} Sanitized user when found, otherwise null.
   */
  static async findUserById(id) {
    const user = await findUserByIdRepo(id);
    return user ? this.#sanitizeUser(user) : null;
  }

  /**
   * Ensures the provided email is not already associated with an existing user.
   * @param {string} email - Email to validate.
   * @returns {Promise<void>} Resolves when the email is available.
   * @private
   */
  static async #ensureEmailAvailable(email) {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      const error = new Error("Email is already registered.");
      error.statusCode = 409;
      throw error;
    }
  }

  /**
   * Ensures the provided username is available for registration.
   * @param {string} username - Username to validate.
   * @returns {Promise<void>} Resolves when the username is available.
   * @private
   */
  static async #ensureUsernameAvailable(username) {
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      const error = new Error("Username is already registered.");
      error.statusCode = 409;
      throw error;
    }
  }

  static async #isRoleExsisting(roleId) {
    const role = await findRoleById(roleId);
    return !!role;
  }

  static async #assignCitizenRole() {
    const citizenRole = await findRoleByName("citizen");
    if (!citizenRole) {
      const error = new Error(
        "Default citizen role not found in database. Registration process stops"
      );
      error.statusCode = 500;
      throw error;
    }
    return citizenRole.id;
  }

  /**
   * Ensures the provided technicalOffice exists.
   * @param {number|null} id - TechincalOfficeId
   * @returns {Promise<void>} Resolves when the username is available.
   * @private
   */
  static async #ensureTechnicalOfficeExists(id) {
    const existingTechnicalOffice = await findTechnicalOfficeById(id);
    if (existingTechnicalOffice || id === null) {
      return;
    }
    const error = new Error(`Technical office with id ${id} not found.`);
    error.statusCode = 404;
    throw error;
  }

  /**
   * Hashes a plain text password using bcrypt with a configured salt factor.
   * @param {string} password - Plain text password to hash.
   * @returns {Promise<string>} Bcrypt hash of the password.
   * @private
   */
  static #hashPassword(password) {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  /**
   * Converts a Sequelize user instance into a plain object and omits sensitive fields.
   * @param {import("sequelize").Model} user - User instance returned by Sequelize.
   * @returns {object} Plain JavaScript object without sensitive attributes.
   * @private
   */
  static #sanitizeUser(user) {
    const plainUser = user.get ? user.get({ plain: true }) : { ...user };
    delete plainUser.hashedPassword;

    // Ensure role is properly converted to a plain object with name property
    if (plainUser.role && typeof plainUser.role === "object") {
      plainUser.role = {
        id: plainUser.role.id,
        name: plainUser.role.name,
      };
    }

    return plainUser;
  }
}
