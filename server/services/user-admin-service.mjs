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

        // Check if user has active reports
        const activeReportsCount = await db.Report.count({
            where: {
                [db.Sequelize.Op.or]: [
                    { technicalOfficerId: userId },
                    { externalMaintainerId: userId }
                ],
                status: {
                    [db.Sequelize.Op.in]: ["Assigned", "In Progress", "Suspended"]
                }
            }
        });

        if (activeReportsCount > 0) {
            throw new AppError(
                `Cannot delete user. They have ${activeReportsCount} active report${activeReportsCount > 1 ? 's' : ''} that must be resolved first.`,
                400
            );
        }

        await deleteUser(userId);

        return true;
    }

    /**
     * Checks if a user can be deleted by verifying they have no active reports.
     * @param {number} userId - The ID of the user to check.
     * @returns {Promise<{canDelete: boolean, activeReportsCount: number, message?: string}>}
     * @throws {AppError} If the user is not found.
     */
    static async checkUserDeletion(userId) {
        const user = await findUserById(userId);
        if (!user) {
            throw new AppError(`User with ID ${userId} not found.`, 404);
        }

        const isCitizen = user.roles.some(role => role.name === "citizen"); 
        
        if (isCitizen) {
            return {
                canDelete: false,
                activeReportsCount: 0,
                message: "Operation not allowed: You cannot delete a Citizen account."
            };
        }

        // Check if user has active reports
        const activeReportsCount = await db.Report.count({
            where: {
                [db.Sequelize.Op.or]: [
                    { technicalOfficerId: userId },
                    { externalMaintainerId: userId }
                ],
                status: {
                    [db.Sequelize.Op.in]: ["Assigned", "In Progress", "Suspended"]
                }
            }
        });

        if (activeReportsCount > 0) {
            return {
                canDelete: false,
                activeReportsCount,
                message: `Cannot delete user. They have ${activeReportsCount} active report${activeReportsCount > 1 ? 's' : ''} that must be resolved first.`
            };
        }

        return {
            canDelete: true,
            activeReportsCount: 0
        };
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
