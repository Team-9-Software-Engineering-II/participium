import {
    findAllUsers,
} from "../repositories/user-repo.mjs";
import {sanitizeUser} from "../shared/utils/userUtils.mjs";

export class UserAdminService {

    /**
     * Gets all municipality users (excluding citizens and admins).
     */
    static async getUsers() {
        return (await findAllUsers()).map(sanitizeUser);
    }
}
