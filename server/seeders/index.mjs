import { seedCategories } from "./seed-category.mjs";
import { seedRoles } from "./seed-roles.mjs";
import { seedTechnicalOffices } from "./seed-technical-office.mjs";
import { seedUsers } from "./seed-users.mjs";

/**
 * Main seeding function.
 * Executes all child seeders in the correct order
 * to respect Foreign Key constraints.
 */
export const seedDatabase = async () => {
  console.log("Starting database seeding...");

  try {
    await seedRoles();
    await seedCategories();
    await seedTechnicalOffices();
    await seedUsers();

    console.log("Database seeding finished successfully.");
  } catch (err) {
    console.error("A critical error occurred during database seeding:", err);

    throw err;
  }
};
