import { findAllRoles } from "../repositories/role-repo.mjs";

export class RoleService {
  /**
   * Gets all assignable roles (excluding citizens and admins).
   */
  static async getAssignableRoles() {
    const allRoles = await findAllRoles();

    return allRoles.filter((role) => {
      const roleName = role.name.toLowerCase();
      return roleName !== "citizen" && roleName !== "admin";
    });
  }
}
