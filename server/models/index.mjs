import { Sequelize } from "sequelize";
import { sequelize } from "../config/db/db-config.mjs";
import initUserModel from "./user.mjs";
import initRoleModel from "./role.mjs";

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = initUserModel(sequelize);
db.Role = initRoleModel(sequelize);

db.User.belongsTo(db.Role, {
  foreignKey: "roleId",
  as: "role",
});

db.Role.hasMany(db.User, {
  foreignKey: "roleId",
  as: "users",
});

export default db;
