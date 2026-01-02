import { Sequelize } from "sequelize";
import { sequelize } from "../config/db/db-config.mjs";
import initUserModel from "./user.mjs";
import initRoleModel from "./role.mjs";
import initTechnicalOfficeModel from "./technical-office.mjs";
import initProblemCategoryModel from "./problem-category.mjs";
import initReportModel from "./report.mjs";
import initCompany from "./company.mjs";
import initCompanyCategory from "./many-to-many/company-category.mjs";
import initMessage from "./message.mjs";
import initUserRole from "./many-to-many/user-role.mjs";
import initUserTechOffice from "./many-to-many/user-technical-office.mjs";

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

/* Initializing models */
db.User = initUserModel(sequelize);
db.Role = initRoleModel(sequelize);
db.TechnicalOffice = initTechnicalOfficeModel(sequelize);
db.Category = initProblemCategoryModel(sequelize);
db.Report = initReportModel(sequelize);
db.Company = initCompany(sequelize);
db.CompanyCategory = initCompanyCategory(sequelize);
db.Message = initMessage(sequelize);
db.UserRole = initUserRole(sequelize);
db.UserTechOffice = initUserTechOffice(sequelize);

/* User - Role relationship (N:M) */
db.User.belongsToMany(db.Role, {
  through: db.UserRole,
  foreignKey: "user_id",
  otherKey: "role_id",
  as: "roles",
});

db.Role.belongsToMany(db.User, {
  through: db.UserRole,
  foreignKey: "role_id",
  otherKey: "user_id",
  as: "users",
});

/* User - Company relationship (1:N) */
db.User.belongsTo(db.Company, {
  foreignKey: "companyId",
  as: "company",
});

db.Company.hasMany(db.User, {
  foreignKey: "companyId",
  as: "users",
});

/* Technical_Office - User realationship (N:M) */

db.TechnicalOffice.belongsToMany(db.User, {
  through: db.UserTechOffice,
  foreignKey: "tech_office_id",
  otherKey: "user_id",
  as: "users",
});

db.User.belongsToMany(db.TechnicalOffice, {
  through: db.UserTechOffice,
  foreignKey: "user_id",
  otherKey: "tech_office_id",
  as: "technicalOffices",
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

/* User (External_Maintainer) - Report relationship (1:N) */
db.Report.belongsTo(db.User, {
  foreignKey: "externalMaintainerId",
  as: "externalMaintainer",
});

db.User.hasMany(db.Report, {
  foreignKey: "externalMaintainerId",
  as: "externalReports",
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

// Report - Company relationship (N:1) - for external maintainer assignment
db.Report.belongsTo(db.Company, {
  foreignKey: "companyId",
  as: "company",
});

db.Company.hasMany(db.Report, {
  foreignKey: "companyId",
  as: "assignedReports",
});

// Company - Category relationship (N:M)
db.Company.belongsToMany(db.Category, {
  through: db.CompanyCategory,
  foreignKey: "company_id",
  otherKey: "category_id",
  as: "categories",
});

db.Category.belongsToMany(db.Company, {
  through: db.CompanyCategory,
  foreignKey: "category_id",
  otherKey: "company_id",
  as: "companies",
});

// User - Message relationship (1:N)
db.User.hasMany(db.Message, { foreignKey: "userId", as: "messagesSent" });
db.Message.belongsTo(db.User, { foreignKey: "userId", as: "author" });

// Report - Message relationship (1:N)
db.Report.hasMany(db.Message, { foreignKey: "reportId", as: "messages" });
db.Message.belongsTo(db.Report, { foreignKey: "reportId", as: "report" });

export default db;
