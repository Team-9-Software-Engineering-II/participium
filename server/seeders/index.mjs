import logger from "../shared/logging/logger.mjs";
import { seedCategories } from "./seed-category.mjs";
import { seedCompanyCategories } from "./seed-company-category.mjs";
import { seedCompanies } from "./seed-company.mjs";
import { seedReports } from "./seed-reports.mjs";
import { seedRoles } from "./seed-roles.mjs";
import { seedTechnicalOffices } from "./seed-technical-office.mjs";
import { seedUserRoles } from "./seed-user-role.mjs";
import { seedUserTechnicalOffices } from "./seed-user-technical-office.mjs";
import { seedUsers } from "./seed-users.mjs";

/**
 * Main seeding function.
 * Executes all child seeders in the correct order
 * to respect Foreign Key constraints.
 */
export const seedDatabase = async () => {
  logger.info("Starting database seeding...");

  try {
    await seedRoles();
    await seedCategories();
    await seedTechnicalOffices();
    await seedCompanies();
    await seedCompanyCategories();
    await seedUsers();
    await seedReports();
    await seedUserRoles();
    await seedUserTechnicalOffices();

    logger.info("Database seeding finished successfully.");
  } catch (err) {
    logger.error("A critical error occurred during database seeding:", err);

    throw err;
  }
};
