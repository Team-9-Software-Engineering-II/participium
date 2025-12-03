/**
 * @file Integration tests for the core Authentication API endpoints (/auth/*).
 * @description Covers user registration, login, session validation, and logout.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";

// Import necessary utilities, setup, teardown, and test data
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  newTestUser,
  adminLogin, // Used as credentials for the fixed admin user
  // We use newTestUser (the data for the user being registered) for most tests
} from "./test-utils.js";

let cookie;
let adminCookie;

// --- Test Hooks (Setup & Teardown) ---

/**
 * @description Resets the test database and seeds initial data before running the suite.
 * Logs in the default admin user provided by the seeder and stores the cookie.
 */
beforeAll(async () => {
  await setupTestDatabase();

  // Login the fixed admin user to get the admin cookie for session checks
  adminCookie = await loginAndGetCookie(adminLogin);
});

/**
 * @description Closes the database connection after all tests in the suite are complete.
 */
afterAll(async () => {
  await teardownTestDatabase();
});

describe("API Authentication Flow", () => {
  describe("POST /auth/register", () => {
    /**
     * @description Test successful registration of a unique user using predefined test data.
     * @returns {number} 201 Created.
     */
    it("should register a new user successfully (201)", async () => {
      const res = await request(app).post("/auth/register").send(newTestUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.email).toBe(newTestUser.email);
    });

    /**
     * @description Test registration failure with an existing email/username.
     * @returns {number} 409 Conflict.
     */
    it("should fail to register with existing email/username (409)", async () => {
      // Use the same unique user data as the previous successful test
      const res = await request(app).post("/auth/register").send(newTestUser);

      expect(res.statusCode).toBe(409);
    });

    /**
     * @description Test registration failure due to invalid email format.
     * @returns {number} 400 Bad Request.
     */
    it("should fail to register with an INVALID email format (400)", async () => {
      const invalidUser = {
        email: "invalidEmail",
        username: `invaliduser-${Date.now()}`,
        firstName: "User",
        lastName: "Tester",
        password: "Password123!",
      };

      const res = await request(app).post("/auth/register").send(invalidUser);

      expect(res.statusCode).toBe(400);
    });

    /**
     * @description Test registration failure when the request body is missing or empty.
     * @returns {number} 400 Bad Request.
     */
    it("should fail to register if the request body is missing or empty (400)", async () => {
      const res = await request(app).post("/auth/register");
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    /**
     * @description Test successful user login and verification of the session cookie presence.
     * @returns {number} 200 OK.
     */
    it("should login successfully (200) and store session cookie", async () => {
      const res = await request(app).post("/auth/login").send({
        username: newTestUser.username,
        password: newTestUser.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);

      // Store the cookie for later session checks and actions
      cookie = res.headers["set-cookie"];
      expect(cookie).toBeDefined();
    });

    /**
     * @description Test login failure due to incorrect password or username.
     * @returns {number} 401 Unauthorized.
     */
    it("should fail login with invalid credentials (401)", async () => {
      const res = await request(app).post("/auth/login").send({
        username: newTestUser.username,
        password: "WrongPassword123",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /auth/session", () => {
    /**
     * @description Test session validation for the authenticated admin user using the stored admin cookie.
     * @returns {number} 200 OK with authenticated status.
     */
    it("should return session info (200) using session cookie", async () => {
      const res = await request(app)
        .get("/auth/session")
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.username).toBe(adminLogin.username);
    });

    /**
     * @description Test session validation failure when no cookie is provided.
     * @returns {number} 401 Unauthorized.
     */
    it("should fail session check if no cookie is provided (401)", async () => {
      const res = await request(app).get("/auth/session");
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe("User not authenticated");
    });
  });

  describe("POST /auth/logout", () => {
    /**
     * @description Test successful user logout. The server should clear the session.
     * @returns {number} 204 No Content.
     */
    it("should logout successfully (204) using session cookie", async () => {
      // Use the cookie obtained during the successful POST /auth/login test
      const res = await request(app).post("/auth/logout").set("Cookie", cookie);

      expect(res.statusCode).toBe(204);
    });
  });
});
