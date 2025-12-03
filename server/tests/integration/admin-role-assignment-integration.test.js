/**
 * @file Integration Test for User Story PT03 - Admin Role Assignment
 * @description This test covers the full flow for an admin assigning
 * roles to municipality users, including security and validation.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";

// Import all necessary utilities from the test-utils.js file
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  uniqueId,
  adminLogin as defaultAdminLogin,
} from "./test-utils.js";

// --- Global variables for storing session cookies and user data ---
/** @type {string} */
let adminCookie;
/** @type {string} */
let attackerCitizenCookie;
/** @type {number} */
let targetCitizenId;

// The local 'uniqueId' variable is replaced by the imported one, but we define
// the test-specific user data here.
/** @type {number} */
const specificUniqueId = uniqueId + 1; // A small offset for differentiation

// --- Test User Definitions ---

/**
 * @type {object} The target user whose role will be changed by the admin.
 */
const targetCitizen = {
  email: `target-${specificUniqueId}@example.com`,
  username: `target${specificUniqueId}`,
  firstName: "Target",
  lastName: "Citizen",
  password: "Password123!",
};

/**
 * @type {object} A second user to test the 403 Forbidden scenario (non-admin trying to assign roles).
 */
const attackerCitizen = {
  email: `attacker-${specificUniqueId + 1}@example.com`,
  username: `attacker${specificUniqueId + 1}`,
  firstName: "Attacker",
  lastName: "Citizen",
  password: "Password123!",
};

/**
 * @type {object} Admin credentials imported from test-utils.js.
 */
const adminLogin = defaultAdminLogin;

// --- Test Hooks (Setup & Teardown) ---

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

/**
 * @description Preamble: Register all necessary users and log in to get session cookies.
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

  // Use the loginAndGetCookie function from test-utils.js
  it("should login as Admin and store the admin cookie", async () => {
    // loginAndGetCookie handles the login request and cookie extraction
    adminCookie = await loginAndGetCookie(adminLogin);
    expect(adminCookie).toBeDefined();

    const res = await request(app).get("/users/me").set("Cookie", adminCookie);
    expect(res.statusCode).toBe(200);
  });

  // Use the loginAndGetCookie function from test-utils.js
  it("should login as 'attacker' citizen and store their cookie", async () => {
    attackerCitizenCookie = await loginAndGetCookie({
      username: attackerCitizen.username,
      password: attackerCitizen.password,
    });
    expect(attackerCitizenCookie).toBeDefined();
  });

  it("should login as 'target' citizen to get their ID", async () => {
    // We keep the original logic here to easily retrieve the ID from the body
    const res = await request(app).post("/auth/login").send({
      username: targetCitizen.username,
      password: targetCitizen.password,
    });
    expect(res.statusCode).toBe(200);
    targetCitizenId = res.body.user.id;
    expect(targetCitizenId).toBeDefined();
  });
});
