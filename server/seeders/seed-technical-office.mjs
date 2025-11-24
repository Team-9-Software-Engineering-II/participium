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
      // ID 1: Water Supply - Drinking Water
      {
        name: "Water Infrastructure Office",
        categoryId: 1,
      },
      // ID 2: Architectural Barriers
      {
        name: "Accessibility and Mobility Office",
        categoryId: 2,
      },
      // ID 3: Sewer System
      {
        name: "Sewerage Network Office",
        categoryId: 3,
      },
      // ID 4: Public Lighting
      {
        name: "Public Lighting Office",
        categoryId: 4,
      },
      // ID 5: Waste
      {
        name: "Waste Management Office",
        categoryId: 5,
      },
      // ID 6: Road Signs and Traffic Lights
      {
        name: "Traffic Management Office",
        categoryId: 6,
      },
      // ID 7: Roads and Urban Furnishings
      {
        name: "Roads Maintenance Office",
        categoryId: 7,
      },
      // ID 8: Public Green Areas and Playgrounds
      {
        name: "Parks and Green Areas Office",
        categoryId: 8,
      },
      // ID 9: Other
      {
        name: "General Services Office",
        categoryId: 9,
      },
    ]);

    console.log("TechnicalOffices seeded successfully.");
  } catch (err) {
    console.error("Error seeding technical offices:", err);
    throw err;
  }
};
