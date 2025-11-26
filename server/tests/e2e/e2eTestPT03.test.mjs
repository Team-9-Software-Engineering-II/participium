/**
 * @file E2E Test for User Story PT03 - Admin Role Assignment
 * @description This test covers the full end-to-end flow for an admin assigning
 * roles to municipality users, including security and validation.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";

// --- Global variables for storing session cookies and user data ---
let adminCookie;
let attackerCitizenCookie;
let targetCitizenId;

const uniqueId = Date.now();

// --- Test User Definitions ---

/**
 * The target user whose role will be changed by the admin.
 */
const targetCitizen = {
  email: `e2e-target-${uniqueId}@example.com`,
  username: `e2e-target${uniqueId}`,
  firstName: "Target",
  lastName: "Citizen",
  password: "Password123!",
};

/**
 * A second user to test the 403 Forbidden scenario (non-admin trying to assign roles).
 */
const attackerCitizen = {
  email: `e2e-attacker-${uniqueId}@example.com`,
  username: `e2e-attacker${uniqueId}`,
  firstName: "Attacker",
  lastName: "Citizen",
  password: "Password123!",
};

/**
 * Admin credentials.
 * @important THIS ASSUMES your seedDatabase() function creates a default admin
 * with these credentials. Adjust them to match your seeder.
 */
const adminLogin = {
  username: "admin@participium.com",
  password: "password123",
};

// --- Test Hooks (Setup & Teardown) ---

beforeAll(async () => {
  // Reset the test database and run seeders
  await sequelize.sync({ force: true });
  await seedDatabase();
});

afterAll(async () => {
  // Close the database connection after all tests
  if (sequelize) {
    await sequelize.close();
  }
});

/**
 * Preamble: Register all necessary users and log in to get session cookies.
 * This block runs before the main tests.
 */
describe("Preamble: User Setup & Login", () => {
  it("should register the target citizen user", async () => {
    const res = await request(app).post("/auth/register").send(targetCitizen);
    expect(res.statusCode).toBe(201);
  });

  it("should register the 'attacker' citizen user", async () => {
    const res = await request(app).post("/auth/register").send(attackerCitizen);
    expect(res.statusCode).toBe(201);
  });

  it("should login as Admin and store the admin cookie", async () => {
    const res = await request(app).post("/auth/login").send(adminLogin);

    // If this fails, check the 'adminLogin' object above
    expect(res.statusCode).toBe(200);
    // Assuming the response body contains user data with role name
    expect(res.body.user.role.name).toBe("admin");

    adminCookie = res.headers["set-cookie"];
    expect(adminCookie).toBeDefined();
  });

  it("should login as 'attacker' citizen and store their cookie", async () => {
    const res = await request(app).post("/auth/login").send({
      username: attackerCitizen.username,
      password: attackerCitizen.password,
    });
    expect(res.statusCode).toBe(200);
    attackerCitizenCookie = res.headers["set-cookie"];
    expect(attackerCitizenCookie).toBeDefined();
  });

  it("should login as 'target' citizen to get their ID", async () => {
    // We log in the target user just to easily retrieve their ID
    const res = await request(app).post("/auth/login").send({
      username: targetCitizen.username,
      password: targetCitizen.password,
    });
    expect(res.statusCode).toBe(200);
    targetCitizenId = res.body.user.id;
    expect(targetCitizenId).toBeDefined();
  });
});
