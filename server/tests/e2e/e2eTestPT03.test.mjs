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
/**
 * Main Test Suite for User Story PT03
 * Endpoint: PUT /users/:userId/role
 */
describe("PUT /users/:userId/role (E2E Test - PT03)", () => {
  // IMPORTANT: Assicurati che 'technical_staff' esista nel tuo database dei ruoli
  const newRoleName = "technical_staff";
  const validPayload = { role: newRoleName };

  describe("Happy Path (Admin Assigns Role)", () => {
    it("should allow an ADMIN to assign a new role to a user (200)", async () => {
      // Ensure variables from preamble are set
      expect(adminCookie).toBeDefined();
      expect(targetCitizenId).toBeDefined();

      const res = await request(app)
        .put(`/admin/users/${targetCitizenId}/role`) // Corretto: template literal usato correttamente
        .set("Cookie", adminCookie)
        .send(validPayload);
      console.log(`Tentativo PUT su URL: /users/${targetCitizenId}/role`);
      // Verify the response
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Role updated successfully.");
    });
  });

  describe("Sad Paths (Security & Validation)", () => {
    it("should REJECT request without authentication (401 Unauthorized)", async () => {
      const res = await request(app)
        .put(`/admin/users/${targetCitizenId}/role`)
        // No .set("Cookie", ...)
        .send(validPayload);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe("User not authenticated");
    });

    it("should FORBID request from a non-admin user (403 Forbidden)", async () => {
      const res = await request(app)
        .put(`/admin/users/${targetCitizenId}/role`)
        .set("Cookie", attackerCitizenCookie) // Use a non-admin cookie
        .send(validPayload);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe("Forbidden: admin only");
    });

    it("should fail if the 'role' field is missing from the body (400 Bad Request)", async () => {
      const payload = { notTheRightField: "foo" }; // Missing 'role'
      const res = await request(app)
        .put(`/admin/users/${targetCitizenId}/role`)
        .set("Cookie", adminCookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Missing required 'role' field.");
    });

    it("should fail if the 'role' name does not exist in the DB (400 Bad Request)", async () => {
      const payload = { role: "non-existent-role" };
      const res = await request(app)
        .put(`/admin/users/${targetCitizenId}/role`)
        .set("Cookie", adminCookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(
        'Role with name "non-existent-role" not found.'
      );
    });

    it("should fail if the 'userId' does not exist in the DB (404 Not Found)", async () => {
      const nonExistentUserId = 99999;
      const res = await request(app)
        .put(`/admin/users/${nonExistentUserId}/role`)
        .set("Cookie", adminCookie)
        .send(validPayload);

      expect(res.statusCode).toBe(404);
      // Corretto: template literal e messaggio atteso
      expect(res.body.message).toBe(
        `User with ID ${nonExistentUserId} not found or not updated.`
      );
    });
  });
});
