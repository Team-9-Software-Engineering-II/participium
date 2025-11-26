import { Sequelize } from "sequelize";
import { sequelize } from "../config/db/db-config.mjs";
import initUserModel from "./user.mjs";
import initRoleModel from "./role.mjs";
import initTechnicalOfficeModel from "./technical-office.mjs";
import initProblemCategoryModel from "./problem-category.mjs";
import initReportModel from "./report.mjs";

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

/* Initializing models */
db.User = initUserModel(sequelize);
db.Role = initRoleModel(sequelize);
db.TechnicalOffice = initTechnicalOfficeModel(sequelize);
db.Category = initProblemCategoryModel(sequelize);
db.Report = initReportModel(sequelize);

/* User - Role relationship (1:N) */
db.User.belongsTo(db.Role, {
  foreignKey: "roleId",
  as: "role",
});

db.Role.hasMany(db.User, {
  foreignKey: "roleId",
  as: "users",
});

/* Technical_Office - User realationship (1:N) */

db.TechnicalOffice.hasMany(db.User, {
  foreignKey: "technicalOfficeId",
  as: "users",
});

db.User.belongsTo(db.TechnicalOffice, {
  foreignKey: "technicalOfficeId",
  as: "technicalOffice",
});

/* Technical_Office - Problem_Category realationship (1:1) */
db.TechnicalOffice.belongsTo(db.Category, {
  foreignKey: {
    name: "categoryId",
    allowNull: true,
    unique: true,
  },
  as: "category",
});

db.Category.hasOne(db.TechnicalOffice, {
  foreignKey: {
    name: "categoryId",
    allowNull: false,
    unique: true,
  },
  as: "technicalOffice",
});

/* User (Citizen) - Report relationship (1:N) */
db.User.hasMany(db.Report, {
  foreignKey: {
    name: "userId",
    allowNull: false,
  },
  as: "reports",
});

db.Report.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
});

/* User (Technical Staff) - Report relationship (1:N) */
db.User.hasMany(db.Report, {
  foreignKey: "technicalOfficerId",
  as: "assignedReports",
});

db.Report.belongsTo(db.User, {
  foreignKey: "technicalOfficerId",
  as: "technicalOfficer",
});

/* Problem_Category - Report relationship (1:N) */
db.Category.hasMany(db.Report, {
  foreignKey: {
    name: "categoryId",
    allowNull: false,
  },
  as: "reports",
});

db.Report.belongsTo(db.Category, {
  foreignKey: "categoryId",
  as: "category",
});

export default db;
