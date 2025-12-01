import db from "../models/index.mjs";
import logger from "../shared/logging/logger.mjs";

const __logger = logger.child({ module: "SeedRoles" });

/**
 * Populate the 'roles' table.
 */
export const seedRoles = async () => {
  try {
    // Check if roles already exists in the database
    const roleCount = await db.Role.count();
    if (roleCount > 0) {
      return;
    }
    await db.Role.bulkCreate([
      { id: 1, name: "citizen" },
      { id: 2, name: "admin" },
      { id: 3, name: "municipal_public_relations_officer" },
      { id: 4, name: "technical_staff" },
      { id: 5, name: "external_maintainer" },
    ]);

    __logger.info("Roles seeded successfully.");
  } catch (err) {
    __logger.error("Error seeding roles:", { error: err.message });
    throw err;
  }
};
