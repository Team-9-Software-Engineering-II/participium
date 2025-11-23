import db from "../models/index.mjs";

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
    ]);

    console.log("Roles seeded successfully.");
  } catch (err) {
    console.error("Error seeding roles:", err);
    throw err;
  }
};
