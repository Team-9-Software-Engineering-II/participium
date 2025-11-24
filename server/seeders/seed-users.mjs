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
    // Technical Staff User 1 (Role ID 4)
    {
      email: "tech@municipality.com",
      username: "tech_staff",
      hashedPassword,
      firstName: "Luca",
      lastName: "Verdi",
      roleId: 4,
      technicalOfficeId: 1,
    },
    // Technical Staff User 2 (Role ID 4)
    {
      email: "tech2@municipality.com",
      username: "tech_staff2",
      hashedPassword,
      firstName: "Mario",
      lastName: "Verdi",
      roleId: 4,
      technicalOfficeId: 2,
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
    const testUser = getTestUser(testHashedPassword);

    // 3. Combine all users into a single array
    const allUsers = [
      ...citizens,
      ...admins,
      ...municipals,
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
