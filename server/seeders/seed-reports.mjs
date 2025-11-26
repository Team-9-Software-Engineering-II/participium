import db from "../models/index.mjs";
import technicalOffice from "../models/technical-office.mjs";

/**
 * Seeds the 'Reports' table with sample data covering various statuses and categories.
 * This seeder MUST run after seedUsers and seedCategories.
 */
export const seedReports = async () => {
  try {
    const count = await db.Report.count();
    if (count > 0) {
      return;
    }

    await db.Report.bulkCreate([
      // 1. Pending Approval (Author: Mario Rossi / User ID 1)
      {
        title: "Open Manhole Cover Near School",
        description:
          "A manhole cover near the elementary school on Via Dante is broken and potentially dangerous for children.",
        status: "Pending Approval",
        latitude: 45.0703,
        longitude: 7.6869,
        anonymous: false,
        photosLinks: null,
        userId: 1,
        categoryId: 7, // Roads and Urban Furnishings
      },
      // 2. Pending Approval (Author: Anna Neri / User ID 2, Anonymous)
      {
        title: "Brown Water in Public Fountain",
        description:
          "The public fountain in the central park is dispensing murky water. It is not safe to drink.",
        status: "Pending Approval",
        latitude: 45.065,
        longitude: 7.68,
        anonymous: true,
        photosLinks: null,
        userId: 2,
        categoryId: 1, // Water Supply
      },
      // 3. Assigned (Author: Paolo Gialli / User ID 3)
      {
        title: "Streetlight Out for Days",
        description:
          "The streetlamp in front of civic number 50 on Corso Francia is out. The area is too dark.",
        status: "Assigned",
        latitude: 45.05,
        longitude: 7.65,
        anonymous: false,
        photosLinks: null,
        userId: 3,
        categoryId: 4, // Public Lighting
        technicalOfficerId: 9,
      },
      // 4. In Progress (Author: Mario Rossi / User ID 1)
      {
        title: "Fallen Tree on Path",
        description:
          "A large branch has fallen in Maddalena Park and is blocking the main trail.",
        status: "In Progress",
        latitude: 45.04,
        longitude: 7.7,
        anonymous: false,
        photosLinks: null,
        userId: 1,
        categoryId: 8, // Public Green Areas
        technicalOfficeId: 13,
      },
      // 5. Resolved (Author: Anna Neri / User ID 2)
      {
        title: "Faded Crosswalk Markings",
        description:
          "The crosswalk markings at the main intersection are nearly invisible, creating a dangerous situation.",
        status: "Resolved",
        latitude: 45.06,
        longitude: 7.67,
        anonymous: false,
        photosLinks: null,
        userId: 2,
        categoryId: 7, // Roads and Urban Furnishings
      },
      // 6. Rejected (Author: Paolo Gialli / User ID 3)
      {
        title: "Missing Fiber Optic Access",
        description:
          "Request for fiber optic installation in a private street.",
        status: "Rejected",
        rejection_reason:
          "Jurisdiction for network infrastructure belongs to private operators.",
        latitude: 45.075,
        longitude: 7.695,
        anonymous: false,
        photosLinks: null,
        userId: 3,
        categoryId: 9, // Other
      },
    ]);

    console.log("Reports seeded successfully.");
  } catch (err) {
    console.error("Error seeding reports:", err);
    throw err;
  }
};
