import db from "../models/index.mjs";

/**
 * Seeds the N:M relationship table CompanyCategory.
 */
export const seedCompanyCategories = async () => {
  try {
    const count = await db.CompanyCategory.count();
    if (count > 0) {
      return;
    }

    const associations = [
      // SMAT (ID 1): Water Supply (1) + Sewer System (3)
      { company_id: 1, category_id: 1 },
      { company_id: 1, category_id: 3 },

      // IREN (ID 2): Public Lighting (4)
      { company_id: 2, category_id: 4 },

      // AMIAT (ID 3): Waste (5)
      { company_id: 3, category_id: 5 },

      // GTT (ID 4): Road Signs/Traffic Lights (6) + Architectural Barriers (2)
      { company_id: 4, category_id: 6 },
      { company_id: 4, category_id: 2 },

      // C.I.T. (ID 5): Roads/Urban Furnishings (7) + Public Green Areas (8)
      { company_id: 5, category_id: 7 },
      { company_id: 5, category_id: 8 },
    ];

    // Bulk Insert nella tabella di giunzione
    await db.CompanyCategory.bulkCreate(associations);

    console.log("Company-Category associations seeded successfully.");
  } catch (err) {
    console.error("Error seeding company-category associations:", err);
    throw err;
  }
};
