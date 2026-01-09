/**
 * @file Test Utilities for Integration Tests.
 * @description Provides standardized data, global setup/teardown functions,
 * and common utility methods like authentication helpers to ensure DRY principles
 * across all integration test suites.
 */

import request from "supertest";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";
import db from "../../models/index.mjs";
import redisClient from "../../config/redis.mjs";
import { transporter } from "../../config/email.mjs";

// --- 1. GLOBAL SETUP & TEARDOWN ---

/**
 * @description Resets the test database and seeds initial data.
 * Should be called in the `beforeAll` hook of integration test suites.
 */
export async function setupTestDatabase() {
  // Ensure the database is clean before running the tests
  await sequelize.sync({ force: true });
  await seedDatabase();

  // Connect Redis
  if (redisClient && !redisClient.isOpen) {
    await redisClient.connect();
  }
}

/**
 * @description Closes the database connection and the Redis client connection.
 * Should be called in the `afterAll` hook of integration test suites.
 */
export async function teardownTestDatabase() {
  // Close Redis
  if (redisClient) {
    if (typeof redisClient.quit === "function") await redisClient.quit();
  }

  if (transporter && typeof transporter.close === "function") {
    transporter.close();
  }

  if (sequelize) {
    await sequelize.close();
    if (sequelize.connectionManager && sequelize.connectionManager.pool) {
      await sequelize.connectionManager.pool.destroyAllNow();
    }
  }
}

// --- 2. COMMON TEST DATA & PAYLOADS ---

/**
 * @type {number} A unique ID based on the current timestamp to ensure uniqueness of usernames and emails.
 */
export const uniqueId = Date.now();

/**
 * @type {object} Credentials for the default Admin user.
 */
export const adminLogin = {
  username: "admin",
  password: "password123",
};

/**
 * @type {object} Credentials for the default PR Officer user.
 */
export const prOfficerLogin = {
  username: "pr_officer",
  password: "password123",
};

/**
 * @type {object} Credentials for a default Citizen user.
 */
export const citizenLogin = {
  username: "mario.rossi",
  password: "password123",
};

/**
 * @type {object} Credentials for the default Technical Staff user (Roads Office, ID 7).
 */
export const technicalStaffLogin = {
  username: "tech_roads",
  password: "password123",
};

/**
 * @type {object} Data for a new unique user to be registered during test execution.
 */
export const newTestUser = {
  email: `user-${uniqueId}@example.com`,
  username: `user${uniqueId}`,
  firstName: "User",
  lastName: "Tester",
  password: "Password123!",
};

/**
 * @type {object} Data for creating a new municipality user via admin endpoint.
 */
export const municipalityUser = {
  email: `municipality-${uniqueId}@example.com`,
  username: `muni${uniqueId}`,
  firstName: "Municipal",
  lastName: "User",
  password: "MunicipalPass123!",
  roleId: 3,
  technicalOfficeId: 1,
};

/**
 * @type {object} A standardized payload for creating a valid report.
 */
export const validReportPayload = {
  title: "Pothole on Main Street",
  description: "There is a huge pothole in front of building 10 on Via Roma.",
  categoryId: 7,
  latitude: 45.0703,
  longitude: 7.6869,
  anonymous: false,
  photos: [
    "https://example.com/photos/pothole1.jpg",
    "https://example.com/photos/pothole2.jpg",
  ],
};

// --- 3. COMMON UTILITY FUNCTIONS ---

/**
 * @description Executes login for the given user credentials and extracts the session cookie.
 * @param {object} userCredentials - The user's login object {username, password}.
 * @returns {Promise<string>} The session cookie string from the response headers.
 * @throws {Error} If login fails.
 */
export async function loginAndGetCookie(userCredentials) {
  const res = await request(app).post("/auth/login").send(userCredentials);

  if (res.statusCode !== 200) {
    throw new Error(
      `Login failed for user ${userCredentials.username}: Status ${res.statusCode}`
    );
  }

  const cookie = res.headers["set-cookie"];
  if (!cookie) {
    throw new Error(`Login failed: No session cookie received.`);
  }

  return cookie;
}

/**
 * @description Finds a user that is not the currently specified user, typically used
 * for testing access restrictions on reports assigned to others.
 * @param {string} excludeUsername - The username of the currently logged-in officer to exclude.
 * @returns {Promise<object>} The database user object of another technical officer.
 */
export async function findAnotherTechnicalOfficer(excludeUsername) {
  return db.User.findOne({
    where: {
      username: { [db.Sequelize.Op.ne]: excludeUsername },
    },
    include: [
      {
        model: db.Role,
        as: "roles",
        where: { name: "technical_staff" },
        required: true,
      },
    ],
  });
}
