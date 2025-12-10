import db from "../models/index.mjs";

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
        title: "Abandoned bulky waste",
        description:
          "Bulky waste (mattress and bags) abandoned on the sidewalk next to the painted wall, obstructing the pedestrian path.",
        status: "Pending Approval",
        latitude: 45.054921,
        longitude: 7.647538,
        address: "Corso Carlo e Nello Rosselli, 10141 Torino TO, Italy",
        anonymous: false,
        photosLinks: [
          "/uploads/reports/5855056996422322993.jpg",
          "/uploads/reports/5855056996422322994.jpg",
        ],
        userId: 1,
        categoryId: 5, // Waste
      },
      // 2. Assigned (Author: Anna Neri / User ID 2, Anonymous)
      {
        title: "Faded cycle path signs",
        description:
          "The signs indicating the presence of the cycle path have faded and should be repainted.",
        status: "Assigned",
        latitude: 45.053701,
        longitude: 7.641821,
        address: "Via Tirreno, 211 10136 Torino TO, Italy",
        anonymous: true,
        photosLinks: [
          "/uploads/reports/5855056996422322990.jpg",
          "/uploads/reports/5855056996422322991.jpg",
        ],
        userId: 2,
        categoryId: 6, // Road Signs and Traffic Lights
        technicalOfficerId: 16,
      },
      // 3. Assigned (Author: Paolo Gialli / User ID 3)
      {
        title: "Broken wall",
        description: "The wall in the photo it is broken",
        status: "Assigned",
        latitude: 45.060214,
        longitude: 7.656853,
        address: "Corso Mediterraneo, 10141 Torino TO, Italy",
        anonymous: false,
        photosLinks: ["/uploads/reports/5855056996422322986.jpg"],
        userId: 3,
        categoryId: 7, // Roads and Urban Furnishings
        technicalOfficerId: 17,
      },
      // 4. In Progress (Author: Mario Rossi / User ID 1)
      {
        title: "Pedestrian crossing with cobblestones",
        description:
          "The pedestrian crossing shown in the photo has several broken cobblestones, it is dangerous because someone could trip over them",
        status: "In Progress",
        latitude: 45.054931,
        longitude: 7.648595,
        address: "Borgo San Paolo, 10141 Torino TO, Italy",
        anonymous: false,
        photosLinks: ["/uploads/reports/5855056996422322997.jpg"],
        userId: 1,
        categoryId: 7, // // Roads and Urban Furnishings
        technicalOfficerId: 16,
      },
      // 5. Resolved (Author: Anna Neri / User ID 2)
      {
        title: "Park sign not legible",
        description: "In Parco Pietro Mennea there is this sign not legible",
        status: "Resolved",
        latitude: 45.053942,
        longitude: 7.648813,
        address: "Torino, 10141 Torino TO, Italy",
        anonymous: false,
        photosLinks: [
          "/uploads/reports/5855056996422322995.jpg",
          "/uploads/reports/5855056996422322996.jpg",
        ],
        userId: 2,
        categoryId: 8, // Public Green Areas and Playgrounds
        technicalOfficerId: 18,
      },
      // 6. Assigned (Author: Paolo Gialli / User ID 3)
      {
        title: "Abandoned shopping cart",
        description:
          "In Parco Pietro Mennea the is a shopping cart abbandoned in the garden near the running track",
        status: "Assigned",
        latitude: 45.053822,
        longitude: 7.648028,
        address: "Torino, 10141 Torino TO, Italy",
        anonymous: false,
        photosLinks: [
          "/uploads/reports/5855056996422322998.jpg",
          "/uploads/reports/5855056996422322999.jpg",
        ],
        userId: 3,
        categoryId: 5, // Waste,
        technicalOfficerId: 15,
        externalMaintainerId: 8,
      },
      {
        title: "Work around traffic lights",
        description:
          "It is not possible to easily reach the traffic light button to cross",
        status: "Rejected",
        rejection_reason:
          "A company is working on to fix problem on that traffic light, we can do anything",
        latitude: 45.064021,
        longitude: 7.659938,
        address: "Corso Castelfidardo, 33, 10138 Torino TO, Italy",
        anonymous: false,
        photosLinks: [
          "/uploads/reports/5855056996422323010.jpg",
          "/uploads/reports/5855056996422323011.jpg",
        ],
        userId: 3,
        categoryId: 6, // Road Signs and Traffic Lights,
        technicalOfficeId: 17,
      },
      {
        title: "Pin in the middle of the cycle path",
        description:
          "In the middle of the cycle path there is a pin which signal a broken piece of cycle path.",
        status: "Assigned",
        latitude: 45.060063,
        longitude: 7.657298,
        address: "Corso Mediterraneo, 10129 Torino TO, Italy",
        anonymous: false,
        photosLinks: [
          "/uploads/reports/5855056996422323005.jpg",
          "/uploads/reports/5855056996422323006.jpg",
        ],
        userId: 3,
        categoryId: 7, // Roads and Urban Furnishings,
        technicalOfficeId: 16,
      },
      {
        title: "Traffic light faded",
        description:
          "I want to signal that the following traffic light is faded.",
        status: "Pending Approval",
        latitude: 45.057649,
        longitude: 7.655652,
        address: "Corso Mediterraneo, 10129 Torino TO, Italy",
        anonymous: false,
        photosLinks: [
          "/uploads/reports/5855056996422323003.jpg",
          "/uploads/reports/5855056996422323004.jpg",
        ],
        userId: 3,
        categoryId: 6, // Road Signs and Traffic Lights,
      },
    ]);

    console.log("Reports seeded successfully.");
  } catch (err) {
    console.error("Error seeding reports:", err);
    throw err;
  }
};
