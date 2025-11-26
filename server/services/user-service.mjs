import {
  findUserById,
  updateUser,
} from "../repositories/user-repo.mjs";
import { sanitizeUser } from "../shared/utils/userUtils.mjs";

/**
 * Provides high level user operations that orchestrate repository calls.
 */
export class UserService {
  /**
   * Updates a user's profile with the provided fields.
   * @param {number} userId - Identifier of the user to update.
   * @param {object} updates - Validated update data from the client.
   * @returns {Promise<object>} A sanitized user representation without sensitive fields.
   */
  static async updateProfile(userId, updates) {
    // Map swagger field names to model field names
    const mappedUpdates = {};

    if (updates.photoUrl !== undefined) {
      mappedUpdates.photoURL = updates.photoUrl;
    }

    if (updates.telegramUsername !== undefined) {
      mappedUpdates.telegramUsername = updates.telegramUsername;
    }

    if (updates.emailNotificationsEnabled !== undefined) {
      mappedUpdates.emailConfiguration = updates.emailNotificationsEnabled;
    }

    const success = await updateUser(userId, mappedUpdates);
    if (!success) {
      const error = new Error(`User with ID ${userId} not found or not updated.`);
      error.statusCode = 404;
      throw error;
    }

    const updatedUser = await findUserById(userId);
    if (!updatedUser) {
      const error = new Error(`User with ID ${userId} not found after update.`);
      error.statusCode = 404;
      throw error;
    }

    return sanitizeUser(updatedUser);
  }
}

