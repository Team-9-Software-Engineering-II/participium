import db from "../models/index.mjs";

/**
 * Seeds the 'TechnicalOffices' table.
 * This seeder MUST run *after* seedCategories.
 */
export const seedTechnicalOffices = async () => {
  try {
    const count = await db.TechnicalOffice.count();
    if (count > 0) {
      return;
    }

    await db.TechnicalOffice.bulkCreate([
      {
        name: "Public Lighting Office",
        categoryId: 4, // Linked to 'Public Lighting'
      },
      {
        name: "Roads Maintenance Office",
        categoryId: 7, // Linked to 'Roads and Urban Furnishings'
      },
      {
        name: "Parks and Green Areas Office",
        categoryId: 8, // Linked to 'Public Green Areas'
      },
    ]);

    console.log("TechnicalOffices seeded successfully.");
  } catch (err) {
    console.error("Error seeding technical offices:", err);
    throw err;
  }
};
