import {
    findAllUsers,
    findUserById,
} from "../repositories/user-repo.mjs";
import { findRoleById } from "../repositories/role-repo.mjs";
import { sanitizeUser } from "../shared/utils/userUtils.mjs";
import AppError from "../shared/utils/app-error.mjs";
import db from "../models/index.mjs";

export class UserAdminService {

    /**
     * Gets all municipality users (excluding citizens and admins).
     */
    static async getUsers() {
        return (await findAllUsers()).map(sanitizeUser);
    }

    /**
     * Updates the roles assigned to a user.
     * Replaces all existing roles with the provided roleIds.
     * @param {number} userId - Identifier of the user to update.
     * @param {number[]} roleIds - Array of role IDs to assign to the user.
     * @returns {Promise<object>} A sanitized user representation with updated roles.
     */
    static async updateUserRoles(userId, roleIds) {
        // Validate user exists
        const user = await findUserById(userId);
        if (!user) {
            throw new AppError(`User with ID ${userId} not found.`, 404);
        }

        // Validate all roles exist
        await this.#ensureAllRolesExist(roleIds);

        // Use transaction to ensure atomicity
        const t = await db.sequelize.transaction();

        try {
            // Replace all existing roles with the new ones
            await user.setRoles(roleIds, { transaction: t });
            await t.commit();

            // Fetch updated user with roles
            const updatedUser = await findUserById(userId);
            return sanitizeUser(updatedUser);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Ensures all provided role IDs exist in the database.
     * @param {number[]} roleIds - Array of role IDs to validate.
     * @throws {AppError} If any role ID is not found.
     * @private
     */
    static async #ensureAllRolesExist(roleIds) {
        const rolePromises = roleIds.map((roleId) => findRoleById(roleId));
        const roles = await Promise.all(rolePromises);

        const missingRoles = [];
        roles.forEach((role, index) => {
            if (!role) {
                missingRoles.push(roleIds[index]);
            }
        });

        if (missingRoles.length > 0) {
            throw new AppError(
                `The following role IDs were not found: ${missingRoles.join(", ")}.`,
                404
            );
        }
    }
}
