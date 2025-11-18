import { RoleService } from "../services/role-service.mjs";

/**
 * Handles HTTP requests for getting the list of assignable roles.
 */
export async function getAssignableRoles(req, res, next) {
  try {
    const roles = await RoleService.getAssignableRoles();
    return res.status(200).json(roles);
  } catch (error) {
    return next(error);
  }
}