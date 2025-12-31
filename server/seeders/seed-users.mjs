import db from "../models/index.mjs";
import bcrypt from "bcrypt";
import logger from "../shared/logging/logger.mjs";

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
    },
    {
      email: "citizen2@example.com",
      username: "anna.neri",
      hashedPassword,
      firstName: "Anna",
      lastName: "Neri",
    },
    {
      email: "citizen3@example.com",
      username: "paolo.gialli",
      hashedPassword,
      firstName: "Paolo",
      lastName: "Gialli",
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
    },
    // Tech Staff 2 (Office ID 2: Accessibility and Mobility)
    {
      email: "tech2@municipality.com",
      username: "tech_mobility",
      hashedPassword,
      firstName: "Sara",
      lastName: "Neri",
    },
    // Tech Staff 3 (Office ID 3: Sewerage Network)
    {
      email: "tech3@municipality.com",
      username: "tech_sewer",
      hashedPassword,
      firstName: "Marco",
      lastName: "Verdi",
    },
    // Tech Staff 4 (Office ID 4: Public Lighting)
    {
      email: "tech4@municipality.com",
      username: "tech_lighting",
      hashedPassword,
      firstName: "Laura",
      lastName: "Gialli",
    },
    // Tech Staff 5 (Office ID 5: Waste Management)
    {
      email: "tech5@municipality.com",
      username: "tech_waste",
      hashedPassword,
      firstName: "Davide",
      lastName: "Bianchi",
    },
    // Tech Staff 6 (Office ID 6: Traffic Management)
    {
      email: "tech6@municipality.com",
      username: "tech_traffic",
      hashedPassword,
      firstName: "Elena",
      lastName: "Marrone",
    },
    // Tech Staff 7 (Office ID 7: Roads Maintenance)
    {
      email: "tech7@municipality.com",
      username: "tech_roads",
      hashedPassword,
      firstName: "Andrea",
      lastName: "Blu",
    },
    // Tech Staff 8 (Office ID 8: Parks and Green Areas)
    {
      email: "tech8@municipality.com",
      username: "tech_green",
      hashedPassword,
      firstName: "Silvia",
      lastName: "Nero",
    },
    // Tech Staff 9 (Office ID 9: General Services)
    {
      email: "tech9@municipality.com",
      username: "tech_general",
      hashedPassword,
      firstName: "Paolo",
      lastName: "Grigio",
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
      companyId: 1,
    },
    // External Maintainer 2 (IREN - Lighting, Company ID 2)
    {
      email: "maint2@iren.it",
      username: "em_light_iren",
      hashedPassword,
      firstName: "Chiara",
      lastName: "Galli",

      companyId: 2,
    },
    // External Maintainer 3 (AMIAT - Waste, Company ID 3)
    {
      email: "maint3@amiat.it",
      username: "em_waste_amiat",
      hashedPassword,
      firstName: "Simone",
      lastName: "Longo",

      companyId: 3,
    },
    // External Maintainer 4 (GTT - Traffic/Roads, Company ID 4)
    {
      email: "maint4@gtt.it",
      username: "em_traffic_gtt",
      hashedPassword,
      firstName: "Federica",
      lastName: "Mancini",

      companyId: 4,
    },
    {
      email: "maint5@cit.it",
      username: "em_urban_services",
      hashedPassword,
      firstName: "Federico",
      lastName: "Bianchi",

      companyId: 5,
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

    logger.info("Users seeded successfully.");
    logger.info("Default password for most users is: password123");
    logger.info("Password for 'test' user is: test");
  } catch (err) {
    logger.error("Error seeding users:", err);
    throw err;
  }
};
