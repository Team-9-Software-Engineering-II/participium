import db from "../models/index.mjs";
import bcrypt from "bcrypt";

const PASSWORD_SALT_ROUNDS = 10;

/**
 * Seeds the 'Users' table with one user for each role plus a test user.
 * This seeder MUST run *after* seedRoles and seedTechnicalOffices.
 */
export const seedUsers = async () => {
  try {
    const count = await db.User.count();
    if (count > 0) {
      return;
    }

    // Hash the default password (e.g., "password123")
    const defaultHashedPassword = await bcrypt.hash(
      "password123",
      PASSWORD_SALT_ROUNDS
    );

    // Hash the specific password for the 'test' user
    const testHashedPassword = await bcrypt.hash("test", PASSWORD_SALT_ROUNDS);

    // We assume Role IDs 1-4 exist from seedRoles
    // We assume TechnicalOffice ID 1 exists from seedTechnicalOffices
    await db.User.bulkCreate([
      // 1. Citizen User
      {
        email: "citizen@example.com",
        username: "mario.rossi",
        hashedPassword: defaultHashedPassword,
        firstName: "Mario",
        lastName: "Rossi",
        roleId: 1,
      },
      // 2. Admin User
      {
        email: "admin@participium.com",
        username: "admin",
        hashedPassword: defaultHashedPassword,
        firstName: "Admin",
        lastName: "User",
        roleId: 2,
      },
      // 3. Municipality Public Relation Officer
      {
        email: "officer@municipality.com",
        username: "pr_officer",
        hashedPassword: defaultHashedPassword,
        firstName: "Giulia",
        lastName: "Bianchi",
        roleId: 3,
      },
      // 4. Technical Staff User
      {
        email: "tech@municipality.com",
        username: "tech_staff",
        hashedPassword: defaultHashedPassword,
        firstName: "Luca",
        lastName: "Verdi",
        roleId: 4,
        technicalOfficeId: 1,
      },
      // 5. Test User (NEW) with citizen role
      {
        email: "test@email.com",
        username: "test",
        hashedPassword: testHashedPassword,
        firstName: "test",
        lastName: "test",
        roleId: 1,
      },
    ]);

    console.log("Users seeded successfully.");
    console.log("Default password for most users is: password123");
    console.log("Password for 'test' user is: test");
  } catch (err) {
    console.error("Error seeding users:", err);
    throw err;
  }
};
