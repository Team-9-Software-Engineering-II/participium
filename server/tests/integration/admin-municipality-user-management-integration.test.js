/**
 * @file Integration tests for Municipality User Management.
 * @description Tests the administrative endpoints for creating and viewing
 * municipality users, ensuring proper authorization and data validation.
 */
process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import db from "../../models/index.mjs";
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  municipalityUser,
  uniqueId,
} from "./test-utils.js";

/** @type {string} The session cookie for the logged-in admin user. */
let adminCookie;

// --- Setup data for the Admin user to be registered ---
/**
 * @type {object} Data for the temporary Admin user required for the test setup.
 * Uses the imported uniqueId to ensure non-conflict registration.
 */
const adminUser = {
  email: `admin-${uniqueId}@example.com`,
  username: `admin${uniqueId}`,
  firstName: "Admin",
  lastName: "User",
  password: "AdminPass123!",
};

/**
 * Executes before all tests in this suite.
 * 1. Sets up and seeds the database.
 * 2. Registers a temporary Admin user.
 * 3. Assigns the 'admin' role to the registered user.
 * 4. Logs in as the Admin user and captures the session cookie.
 */
beforeAll(async () => {
  // 1. Setup the database
  await setupTestDatabase();

  // Fetch User and Role models
  const User = db.User;
  const Role = db.Role;

  // 2. Register admin
  await request(app).post("/auth/register").send(adminUser);

  // 3. Find and assign the 'admin' role
  const adminRole = await Role.findOne({ where: { name: "admin" } });
  if (!adminRole) {
    throw new Error("Admin role not found in database.");
  }
  const admin = await User.findOne({ where: { username: adminUser.username } });

  if (admin) {
    await admin.update({ roleId: adminRole.id }); // Assign admin role
  }

  // 4. Log in as admin to get the cookie
  try {
    adminCookie = await loginAndGetCookie({
      username: adminUser.username,
      password: adminUser.password,
    });
  } catch (error) {
    throw new Error(`Failed to log in Admin user: ${error.message}`);
  }
  expect(adminCookie).toBeDefined();
});

/**
 * Executes after all tests in this suite.
 * Closes the database connection.
 */
afterAll(async () => {
  await teardownTestDatabase();
});

/**
 * Test suite for Municipality User Management endpoints.
 */
describe("Municipality User Management", () => {
  /**
   * Test suite for POST /admin/users (createMunicipalityUser).
   */
  describe("createMunicipalityUser", () => {
    /**
     * Test case: Successful creation of a new municipality user.
     */
    it("should create a new municipality user successfully (201)", async () => {
      const res = await request(app)
        .post("/admin/users")
        .set("Cookie", adminCookie)
        .send(municipalityUser); // Uses imported municipalityUser data

      expect(res.statusCode).toBe(201);
      expect(res.body).not.toHaveProperty("password"); // Password should not be returned
    });

    /**
     * Test case: Failure due to existing email (Conflict 409).
     */
    it("should fail to create with existing email (409)", async () => {
      const timestamp = Date.now();
      const conflictEmail = `conflict-${timestamp}@example.com`;

      const userToPreload = {
        ...municipalityUser,
        email: conflictEmail,
        username: `user1-${timestamp}`,
      };

      await request(app)
        .post("/admin/users")
        .set("Cookie", adminCookie)
        .send(userToPreload)
        .expect(201);

      const duplicateUser = {
        ...municipalityUser,
        email: conflictEmail,
        username: `user2-${timestamp}`,
      };

      const res = await request(app)
        .post("/admin/users")
        .set("Cookie", adminCookie)
        .send(duplicateUser);

      expect(res.statusCode).toBe(409);
    });

    /**
     * Test case: Failure due to existing username (Conflict 409).
     */
    it("should fail to create with existing username (409)", async () => {
      const timestamp = Date.now();
      const conflictUsername = `${timestamp}`;

      const userToPreload = {
        ...municipalityUser,
        username: conflictUsername,
        email: "newEMail@gmail.com",
      };

      await request(app)
        .post("/admin/users")
        .set("Cookie", adminCookie)
        .send(userToPreload)
        .expect(201);

      const duplicateUser = {
        ...municipalityUser,
        email: `user2@gmail.com`,
        username: conflictUsername,
      };

      const res = await request(app)
        .post("/admin/users")
        .set("Cookie", adminCookie)
        .send(duplicateUser);

      expect(res.statusCode).toBe(409);
    });

    /**
     * Test case: Failure due to invalid or missing request body (Bad Request 400).
     */
    it("should fail if request body is invalid or missing (400)", async () => {
      const res = await request(app)
        .post("/admin/users")
        .set("Cookie", adminCookie)
        .send({}); // empty body

      expect(res.statusCode).toBe(400);
    });

    /**
     * Test case: Failure when not authenticated (Unauthorized 401).
     */
    it("should return 401 if not authenticated", async () => {
      const unauthenticatedUser = {
        email: `unauth-${Date.now()}@example.com`,
        username: `unauth${Date.now()}`,
        firstName: "NoAuth",
        lastName: "User",
        password: "Password123!",
      };
      const res = await request(app)
        .post("/admin/users")
        .send(unauthenticatedUser);

      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test suite for GET /admin/users (getAllUsers).
   */
  describe("GET /admin/users (getAllUsers)", () => {
    /**
     * Test case: Successful retrieval of all users by an authenticated admin.
     */
    it("should return all users (200) for authenticated admin", async () => {
      const res = await request(app)
        .get("/admin/users")
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Verify that the created municipality user is included
      expect(res.body.some((u) => u.email === municipalityUser.email)).toBe(
        true
      );
    });

    /**
     * Test case: Failure when not authenticated (Unauthorized 401).
     */
    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/admin/users");
      expect(res.statusCode).toBe(401);
    });
  });
});
