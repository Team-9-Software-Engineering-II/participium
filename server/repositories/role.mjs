import db from "../models/index.mjs";

export async function createRole(roleData) {
  return db.Role.create(roleData);
}

export async function findAllRoles() {
  return db.Role.findAll();
}

export async function findRoleById(id) {
  return db.Role.findByPk(id);
}

export async function findRoleByName(name) {
  return db.Role.findOne({ where: { name } });
}

export async function updateRole(id, roleData) {
  const [updatedRows] = await db.Role.update(roleData, {
    where: { id },
  });
  return updatedRows > 0;
}

export async function deleteRole(id) {
  const deletedRows = await db.Role.destroy({
    where: { id },
  });
  return deletedRows > 0;
}
