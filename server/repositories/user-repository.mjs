import db from "../models/index.mjs";

export async function createUser(userData) {
  return db.User.create(userData);
}

/* Find all users, including their role */
export async function findAllUsers() {
  return db.User.findAll({
    include: {
      model: db.Role,
      as: "role",
    },
  });
}

export async function findUserById(id) {
  return db.User.findByPk(id, {
    include: { model: db.Role, as: "role" },
  });
}

export async function findUserByEmail(email) {
  return db.User.findOne({
    where: { email },
    include: { model: db.Role, as: "role" },
  });
}

export async function findUserByUsername(username) {
  return db.User.findOne({
    where: { username },
    include: { model: db.Role, as: "role" },
  });
}

/* Update a specific user by passing the id and the user data*/
export async function updateUser(id, userData) {
  const [updatedRows] = await db.User.update(userData, {
    where: { id },
  });
  return updatedRows > 0;
}

export async function deleteUser(id) {
  const deletedRows = await db.User.destroy({
    where: { id },
  });
  return deletedRows > 0;
}
