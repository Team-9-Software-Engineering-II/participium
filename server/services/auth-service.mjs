import bcrypt from "bcrypt";
import db from "../models/index.mjs";
import { sequelize } from "../config/db/db-config.mjs";
import {
  createUser,
  findUserByEmail,
  findUserById as findUserByIdRepo,
  findUserByUsername,
} from "../repositories/user-repo.mjs";
import { findRoleById } from "../repositories/role-repo.mjs";
import { findRoleByName } from "../repositories/role-repo.mjs"; // added for refactoring
import { findTechnicalOfficeById } from "../repositories/technical-office-repo.mjs";
import {
  saveTemporaryUser,
  getTemporaryUser,
  deleteTemporaryUser,
} from "../repositories/redis-repo.mjs";
import { EmailService } from "./email-service.mjs";
import AppError from "../shared/utils/app-error.mjs";
import logger from "../shared/logging/logger.mjs";

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
      throw new AppError(`Role with id ${roleId} not found`, 404);
    }

    const hashedPassword = await this.#hashPassword(password);

    const t = await db.sequelize.transaction();

    try {
      const newUser = await createUser({
        email,
        username,
        firstName,
        lastName,
        hashedPassword,
      });

      if (roleId) {
        await newUser.addRole(roleId, { transaction: t });
      }

      if (technicalOfficeId) {
        await newUser.addTechnicalOffice(technicalOfficeId, { transaction: t });
      }

      await t.commit();

      const hydratedUser = await findUserByIdRepo(newUser.id);
      return this.#sanitizeUser(hydratedUser ?? newUser);
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /** Validates the provided email format using a basic regex
   * @param {string} email - Email to validate.
   * @throws {Error} If the email format is invalid, with status 400.
   * @private
   */
  static #validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      throw new AppError("Invalid email format.", 400);
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
      throw new AppError("Email is already registered.", 409);
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
      throw new AppError("Username is already registered.", 409);
    }
  }

  static async #isRoleExsisting(roleId) {
    const role = await findRoleById(roleId);
    return !!role;
  }

  static async #assignCitizenRole() {
    const citizenRole = await findRoleByName("citizen");
    if (!citizenRole) {
      throw new Error(
        "Default citizen role not found in database. Registration process stops",
        500
      );
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
    throw new AppError(`Technical office with id ${id} not found.`, 404);
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
    if (
      plainUser.roles &&
      Array.isArray(plainUser.roles) &&
      plainUser.roles.length > 0
    ) {
      plainUser.role = {
        id: plainUser.roles[0].id,
        name: plainUser.roles[0].name,
      };
      plainUser.roles = plainUser.roles.map((r) => ({
        id: r.id,
        name: r.name,
      }));
    } else {
      plainUser.role = null;
      plainUser.roles = [];
    }

    // Include technicalOffices for TechnicalOfficeStaff
    if (plainUser.technicalOffices && Array.isArray(plainUser.technicalOffices)) {
      plainUser.technicalOffices = plainUser.technicalOffices.map((office) => ({
        id: office.id,
        name: office.name,
        categoryId: office.categoryId,
        category: office.category ? {
          id: office.category.id,
          name: office.category.name,
        } : null,
      }));
    }

    // Include company for ExternalMaintainer
    if (plainUser.company) {
      plainUser.company = {
        id: plainUser.company.id,
        name: plainUser.company.name,
      };
    }

    return plainUser;
  }

  /**
   * Generates a random 6-digit confirmation code.
   * @returns {string} A 6-digit string code.
   * @private
   */
  static #generateConfirmationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Registers a new user temporarily in Redis with a confirmation code.
   * If the email or username already exists in the database, an error is thrown.
   * If the same email exists in Redis, it will be overwritten.
   * Sends a verification email with the confirmation code.
   * @param {object} userInput - Raw registration data from the client.
   * @returns {Promise<object>} An object containing the confirmation code and expiration time.
   */
  static async registerUserRequest(userInput) {
    const { email, username, password, firstName, lastName } = userInput;

    this.#validateEmailFormat(email);

    // Check if email or username already exist in the database
    await this.#ensureEmailAvailable(email);
    await this.#ensureUsernameAvailable(username);

    // Generate a 6-digit confirmation code
    const confirmationCode = this.#generateConfirmationCode();

    // Save user data temporarily in Redis (overwrites if same email exists)
    await saveTemporaryUser(
      email,
      {
        email,
        username,
        password,
        firstName,
        lastName,
      },
      confirmationCode
    );

    // Send verification email with the confirmation code
    const emailResult = await EmailService.sendVerificationCode(
      email,
      confirmationCode,
      firstName
    );

    return {
      message:
        "Registration request submitted successfully. Please check your email for the verification code.",
      confirmationCode,
      expiresIn: 1800,
      emailPreviewUrl: emailResult.previewUrl,
    };
  }

  /**
   * Verifies the OTP code and creates the user in the database if valid.
   * @param {string} email - Email used to look up the temporary registration data.
   * @param {string} confirmationCode - The 6-digit confirmation code to verify.
   * @returns {Promise<object>} A sanitized user representation without sensitive fields.
   */
  static async verifyAndCreateUser(email, confirmationCode) {
    this.#validateEmailFormat(email);

    // Retrieve temporary user data from Redis
    const temporaryUser = await getTemporaryUser(email);

    if (!temporaryUser) {
      const registrationReqNotFoundOrExpiredMessage =
        "Registration request not found or has expired. Please submit a new registration request.";
      logger.warn(registrationReqNotFoundOrExpiredMessage);
      throw new AppError(registrationReqNotFoundOrExpiredMessage, 404);
    }

    // Verify the confirmation code
    if (temporaryUser.verificationCode !== confirmationCode) {
      const invalidConfirmationCodeMessage = "Invalid confirmation code.";
      logger.warn(invalidConfirmationCodeMessage);
      throw new AppError(invalidConfirmationCodeMessage, 400);
    }

    // Double-check that email and username are still available (race condition protection)
    await this.#ensureEmailAvailable(temporaryUser.email);
    await this.#ensureUsernameAvailable(temporaryUser.username);

    // Get the default citizen role
    const defaultCitizenRole = await this.#assignCitizenRole();

    // Hash the password and create the user
    const hashedPassword = await this.#hashPassword(temporaryUser.password);
    const createdUser = await createUser({
      email: temporaryUser.email,
      username: temporaryUser.username,
      firstName: temporaryUser.firstName,
      lastName: temporaryUser.lastName,
      hashedPassword,
      roleId: defaultCitizenRole,
    });

    // Delete the temporary data from Redis after successful registration
    await deleteTemporaryUser(email);

    const hydratedUser = await findUserByIdRepo(createdUser.id);
    return this.#sanitizeUser(hydratedUser ?? createdUser);
  }
}
