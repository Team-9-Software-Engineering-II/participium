import db from "../models/index.mjs";

/**
 * Creates a new role.
 */
export async function createRole(roleData) {
  return db.Role.create(roleData);
}

/**
 * Finds all roles.
 */
export async function findAllRoles() {
  return db.Role.findAll();
}

/**
 * Finds a role by its ID.
 */
export async function findRoleById(id) {
  return db.Role.findByPk(id);
}

/**
 * Finds a role by its name.
 */
export async function findRoleByName(name) {
  return db.Role.findOne({ where: { name } });
}

/**
 * Updates a role by its ID.
 */
export async function updateRole(id, roleData) {
  const [updatedRows] = await db.Role.update(roleData, {
    where: { id },
  });
  return updatedRows > 0;
}

/**
 * Deletes a role by its ID.
 */
export async function deleteRole(id) {
  const deletedRows = await db.Role.destroy({
    where: { id },
  });
  return deletedRows > 0;
}
