import {
    findAllUsers,
    findUserById,
    deleteUser
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
     * Updates the roles assigned to a user with their associations.
     * Replaces all existing roles and associations with the provided data.
     * @param {number} userId - Identifier of the user to update.
     * @param {Array<{roleId: number, technicalOfficeIds?: number[], companyId?: number}>} roles - Array of role objects with associations.
     * @returns {Promise<object>} A sanitized user representation with updated roles.
     */
    static async updateUserRoles(userId, roles) {
        // Validate user exists
        const user = await findUserById(userId);
        if (!user) {
            throw new AppError(`User with ID ${userId} not found.`, 404);
        }

        // Extract roleIds for validation
        const roleIds = roles.map(r => r.roleId);
        await this.#ensureAllRolesExist(roleIds);

        // Use transaction to ensure atomicity
        const t = await db.sequelize.transaction();

        try {
            // Replace all existing roles with the new ones
            await user.setRoles(roleIds, { transaction: t });

            // Clear all technical office associations
            await user.setTechnicalOffices([], { transaction: t });

            // Set new technical office associations
            const allOfficeIds = [];
            roles.forEach(role => {
                if (role.technicalOfficeIds && role.technicalOfficeIds.length > 0) {
                    allOfficeIds.push(...role.technicalOfficeIds);
                }
            });
            
            if (allOfficeIds.length > 0) {
                // Remove duplicates
                const uniqueOfficeIds = [...new Set(allOfficeIds)];
                await user.setTechnicalOffices(uniqueOfficeIds, { transaction: t });
            }

            // Handle company association (only one company per user)
            const companyRole = roles.find(r => r.companyId);
            if (companyRole) {
                await user.update({ companyId: companyRole.companyId }, { transaction: t });
            } else {
                // Clear company if no role requires it
                await user.update({ companyId: null }, { transaction: t });
            }

            await t.commit();

            // Fetch updated user with roles and associations
            const updatedUser = await findUserById(userId);
            return sanitizeUser(updatedUser);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Removes a user from the system.
     * @param {number} userId - Identifier of the user to delete.
     * @returns {Promise<boolean>} True if operation was successful.
     * @throws {AppError} If the user is not found.
     */
    static async deleteUser(userId) {
        const user = await findUserById(userId);
        if (!user) {
            throw new AppError(`User with ID ${userId} not found.`, 404);
        }
        const isCitizen = user.roles.some(role => role.name === "citizen"); 
        
        if (isCitizen) {
             throw new AppError("Operation not allowed: You cannot delete a Citizen account.", 403);
        }
        await deleteUser(userId);

        return true;
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
