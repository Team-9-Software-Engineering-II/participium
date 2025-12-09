import db from "../models/index.mjs";
import bcrypt from "bcrypt";

const PASSWORD_SALT_ROUNDS = 10;

/**
 * Generates the list of Citizen users.
 * @param {string} hashedPassword - The hashed password to use.
 */
const getCitizenUsers = (hashedPassword) => {
  return [
    {
      email: "citizen@example.com",
      username: "mario.rossi",
      hashedPassword,
      firstName: "Mario",
      lastName: "Rossi",
      roleId: 1,
    },
    {
      email: "citizen2@example.com",
      username: "anna.neri",
      hashedPassword,
      firstName: "Anna",
      lastName: "Neri",
      roleId: 1,
    },
    {
      email: "citizen3@example.com",
      username: "paolo.gialli",
      hashedPassword,
      firstName: "Paolo",
      lastName: "Gialli",
      roleId: 1,
    },
  ];
};

/**
 * Generates the list of Admin users.
 * @param {string} hashedPassword - The hashed password to use.
 */
const getAdminUsers = (hashedPassword) => {
  return [
    // Admin User (Role ID 2)
    {
      email: "admin@participium.com",
      username: "admin",
      hashedPassword,
      firstName: "Admin",
      lastName: "User",
      roleId: 2,
    },
  ];
};

/**
 * Generates the list of Municipal users.
 * @param {string} hashedPassword - The hashed password to use.
 */
const getMunicipalUsers = (hashedPassword) => {
  return [
    // Municipal Public Relation Officer (Role ID 3)
    {
      email: "officer@municipality.com",
      username: "pr_officer",
      hashedPassword,
      firstName: "Giulia",
      lastName: "Bianchi",
      roleId: 3,
    },
  ];
};

/**
 * Generates the list of Staff member users.
 * @param {string} hashedPassword - The hashed password to use.
 */
const getStaffUsers = (hashedPassword) => {
  return [
    // Tech Staff 1 (Office ID 1: Water Infrastructure)
    {
      email: "tech1@municipality.com",
      username: "tech_water",
      hashedPassword,
      firstName: "Luca",
      lastName: "Rossi",
      roleId: 4,
      technicalOfficeId: 1,
    },
    // Tech Staff 2 (Office ID 2: Accessibility and Mobility)
    {
      email: "tech2@municipality.com",
      username: "tech_mobility",
      hashedPassword,
      firstName: "Sara",
      lastName: "Neri",
      roleId: 4,
      technicalOfficeId: 2,
    },
    // Tech Staff 3 (Office ID 3: Sewerage Network)
    {
      email: "tech3@municipality.com",
      username: "tech_sewer",
      hashedPassword,
      firstName: "Marco",
      lastName: "Verdi",
      roleId: 4,
      technicalOfficeId: 3,
    },
    // Tech Staff 4 (Office ID 4: Public Lighting)
    {
      email: "tech4@municipality.com",
      username: "tech_lighting",
      hashedPassword,
      firstName: "Laura",
      lastName: "Gialli",
      roleId: 4,
      technicalOfficeId: 4,
    },
    // Tech Staff 5 (Office ID 5: Waste Management)
    {
      email: "tech5@municipality.com",
      username: "tech_waste",
      hashedPassword,
      firstName: "Davide",
      lastName: "Bianchi",
      roleId: 4,
      technicalOfficeId: 5,
    },
    // Tech Staff 6 (Office ID 6: Traffic Management)
    {
      email: "tech6@municipality.com",
      username: "tech_traffic",
      hashedPassword,
      firstName: "Elena",
      lastName: "Marrone",
      roleId: 4,
      technicalOfficeId: 6,
    },
    // Tech Staff 7 (Office ID 7: Roads Maintenance)
    {
      email: "tech7@municipality.com",
      username: "tech_roads",
      hashedPassword,
      firstName: "Andrea",
      lastName: "Blu",
      roleId: 4,
      technicalOfficeId: 7,
    },
    // Tech Staff 8 (Office ID 8: Parks and Green Areas)
    {
      email: "tech8@municipality.com",
      username: "tech_green",
      hashedPassword,
      firstName: "Silvia",
      lastName: "Nero",
      roleId: 4,
      technicalOfficeId: 8,
    },
    // Tech Staff 9 (Office ID 9: General Services)
    {
      email: "tech9@municipality.com",
      username: "tech_general",
      hashedPassword,
      firstName: "Paolo",
      lastName: "Grigio",
      roleId: 4,
      technicalOfficeId: 9,
    },
  ];
};

/**
 * Generates the list of External Maintainer users.
 * Assumes Role ID 5 is the External Maintainer role.
 * @param {string} hashedPassword - The hashed password to use.
 */
const getExternalMaintainers = (hashedPassword) => {
  return [
    // External Maintainer 1 (SMAT - Water, Company ID 1)
    {
      email: "maint1@smat.it",
      username: "em_water_smat",
      hashedPassword,
      firstName: "Davide",
      lastName: "Rizzo",
      roleId: 5,
      companyId: 1,
    },
    // External Maintainer 2 (IREN - Lighting, Company ID 2)
    {
      email: "maint2@iren.it",
      username: "em_light_iren",
      hashedPassword,
      firstName: "Chiara",
      lastName: "Galli",
      roleId: 5,
      companyId: 2,
    },
    // External Maintainer 3 (AMIAT - Waste, Company ID 3)
    {
      email: "maint3@amiat.it",
      username: "em_waste_amiat",
      hashedPassword,
      firstName: "Simone",
      lastName: "Longo",
      roleId: 5,
      companyId: 3,
    },
    // External Maintainer 4 (GTT - Traffic/Roads, Company ID 4)
    {
      email: "maint4@gtt.it",
      username: "em_traffic_gtt",
      hashedPassword,
      firstName: "Federica",
      lastName: "Mancini",
      roleId: 5,
      companyId: 4,
    },
  ];
};

/**
 * Generates the Test user.
 * @param {string} hashedPassword - The specific hashed password for test user.
 */
const getTestUser = (hashedPassword) => {
  return {
    email: "test@email.com",
    username: "test",
    hashedPassword,
    firstName: "test",
    lastName: "test",
    roleId: 1,
  };
};

/**
 * Main seeding function.
 * Orchestrates the creation of all user types.
 *
 * Seeds the 'Users' table with at least one user for each role and a test user.
 * This seeder MUST run *after* seedRoles and seedTechnicalOffices.
 */

export const seedUsers = async () => {
  try {
    const count = await db.User.count();
    if (count > 0) {
      return;
    }

    // 1. Prepare Passwords
    const defaultHashedPassword = await bcrypt.hash(
      "password123",
      PASSWORD_SALT_ROUNDS
    );
    const testHashedPassword = await bcrypt.hash("test", PASSWORD_SALT_ROUNDS);

    // 2. Gather Data from Helper Functions
    const citizens = getCitizenUsers(defaultHashedPassword);
    const admins = getAdminUsers(defaultHashedPassword);
    const municipals = getMunicipalUsers(defaultHashedPassword);
    const staff = getStaffUsers(defaultHashedPassword);
    const external_maintainers = getExternalMaintainers(defaultHashedPassword);
    const testUser = getTestUser(testHashedPassword);

    // 3. Combine all users into a single array
    const allUsers = [
      ...citizens,
      ...admins,
      ...municipals,
      ...external_maintainers,
      ...staff,
      testUser,
    ];

    // 4. Bulk Insert
    await db.User.bulkCreate(allUsers);

    console.log("Users seeded successfully.");
    console.log("Default password for most users is: password123");
    console.log("Password for 'test' user is: test");
  } catch (err) {
    console.error("Error seeding users:", err);
    throw err;
  }
};
