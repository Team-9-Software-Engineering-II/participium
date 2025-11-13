import {
    findAllUsers,
    updateUser,
} from "../repositories/user-repo.mjs";
import {findRoleByName} from "../repositories/role-repo.mjs";
import {sanitizeUser} from "../shared/utils/userUtils.mjs";

export class UserAdminService {
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
        const success = await updateUser(userId, {roleId: role.id});
        if (!success) {
            const error = new Error(
                `User with ID ${userId} not found or not updated.`
            );
            error.statusCode = 404; // Not Found
            throw error;
        }
        return success;
    }

    /**
     * Gets all municipality users (excluding citizens and admins).
     */
    static async getUsers() {
        return (await findAllUsers()).map(sanitizeUser);
    }
}
