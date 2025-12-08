/**
 * @file Integration tests for the core Authentication API endpoints (/auth/*).
 * @description Covers the new registration flow (request -> verify), login, session validation, and logout.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import bcrypt from "bcrypt";
import { app } from "../../index.mjs";
import db from "../../models/index.mjs";
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  adminLogin,
  uniqueId,
} from "./test-utils.js";
import redisClient from "../../config/redis.mjs";
import { getTemporaryUser } from "../../repositories/redis-repo.mjs";

/** @typedef {object} UserData
 * @property {string} email
 * @property {string} username
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} password
 */

// --- TEST DATA ---

/** @type {UserData} Data for a new user registered via the verification flow. */
const userForVerificationFlow = {
  email: `verify-flow-${uniqueId}@example.com`,
  username: `verifyflow${uniqueId}`,
  firstName: "Verified",
  lastName: "Citizen",
  password: "SecurePass123!",
};

/** @type {UserData} Data for a user pre-created in the DB (for login tests). */
const userForLoginTests = {
  email: `login-test-${uniqueId}@example.com`,
  username: `logintest${uniqueId}`,
  firstName: "Login",
  lastName: "Test",
  password: "PasswordToLogin123!",
};

/** @type {string} Session cookie for the pre-created citizen. */
let citizenCookie;
/** @type {string} Session cookie for the admin user. */
let adminCookie;
/** @type {string} Session cookie for the user created and verified during the test. */
let verifiedUserCookie;

// --- TEST HOOKS (SETUP & TEARDOWN) ---

/**
 * @description Sets up the database, connects Redis, logs in the admin, and pre-creates a user for login tests.
 */
beforeAll(async () => {
  // 1. Setup Database
  await setupTestDatabase();

  // 2. Log in Admin
  adminCookie = await loginAndGetCookie(adminLogin);

  // 3. Pre-create a standard user directly in the DB
  const citizenRole = await db.Role.findOne({ where: { name: "citizen" } });
  if (!citizenRole) throw new Error("Citizen role not found.");

  // Generate a valid bcrypt hash for the test password
  const hashedPassword = await bcrypt.hash(userForLoginTests.password, 10);

  await db.User.create({
    email: userForLoginTests.email,
    username: userForLoginTests.username,
    firstName: userForLoginTests.firstName,
    lastName: userForLoginTests.lastName,
    hashedPassword: hashedPassword,
    roleId: citizenRole.id,
  });
});

/**
 * @description Cleans up temporary data and closes connections.
 */
afterAll(async () => {
  // 1. Clean up Redis temporary user data
  await redisClient.del(`temp_user:${userForVerificationFlow.email}`);

  // 2. Close Database connection
  await teardownTestDatabase();
});

// --- TEST SUITE START ---

describe("API Authentication Flow (Citizen)", () => {
  describe("POST /auth/register (LEGACY/ADMIN only)", () => {
    /**
     * @description Test that the legacy /register endpoint correctly handles conflicts for existing citizens.
     * @returns {number} 409 Conflict.
     */
    it("should fail to register with existing email/username (409) if still enabled", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({
          ...userForLoginTests,
          password: "newPass123",
        });

      expect(res.statusCode).toBe(409);
    });
  });

  describe("Citizen Registration with Email Verification Flow", () => {
    let confirmationCode;

    describe("POST /auth/register-request", () => {
      /**
       * @description Test successful temporary registration in Redis and retrieval of the code.
       * @returns {number} 200 OK.
       */
      it("should save user data to Redis and return a confirmation code (200)", async () => {
        const res = await request(app)
          .post("/auth/register-request")
          .send(userForVerificationFlow);

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("confirmationCode");

        confirmationCode = res.body.confirmationCode;

        // Verify: User should NOT be in the permanent DB
        const userInDb = await db.User.findOne({
          where: { email: userForVerificationFlow.email },
        });
        expect(userInDb).toBeNull();

        // Verify: Temporary user data must be in Redis
        const userInRedis = await getTemporaryUser(
          userForVerificationFlow.email
        );
        expect(userInRedis).not.toBeNull();
        expect(userInRedis.verificationCode).toBe(confirmationCode);
      });

      /**
       * @description Test failure when the email already exists in the permanent DB.
       * @returns {number} 409 Conflict.
       */
      it("should fail if email is already registered in the permanent DB (409)", async () => {
        const res = await request(app)
          .post("/auth/register-request")
          .send({
            ...userForVerificationFlow,
            email: userForLoginTests.email,
            username: `unique-name-${uniqueId}`,
          });

        expect(res.statusCode).toBe(409);
        expect(res.body.message).toContain("Email is already registered.");
      });
    });

    describe("POST /auth/verify-registration", () => {
      /**
       * @description Test successful verification, user creation in DB, and automatic login.
       * @returns {number} 201 Created.
       */
      it("should successfully verify code, create user in DB, and log in (201)", async () => {
        expect(confirmationCode).toBeDefined();

        const res = await request(app).post("/auth/verify-registration").send({
          email: userForVerificationFlow.email,
          confirmationCode: confirmationCode,
        });

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("authenticated", true);

        // Store the new user's cookie
        verifiedUserCookie = res.headers["set-cookie"];

        // Verify: User MUST exist in the permanent DB now
        const userInDb = await db.User.findOne({
          where: { email: userForVerificationFlow.email },
        });
        expect(userInDb).not.toBeNull();

        // Verify: Temporary data MUST be deleted from Redis
        const userInRedis = await getTemporaryUser(
          userForVerificationFlow.email
        );
        expect(userInRedis).toBeNull();
      });

      /**
       * @description Test failure when the confirmation code does not match.
       * @returns {number} 400 Bad Request.
       */
      it("should fail if the confirmation code is invalid (400)", async () => {
        // Generate a new temporary user for this specific test
        const uniqueFailId = Date.now() + 1;
        const failUser = {
          email: `fail-${uniqueFailId}@example.com`,
          username: `fail${uniqueFailId}`,
          password: "P1!",
          firstName: "F",
          lastName: "U",
        };

        // 1. Request registration (saves user to Redis)
        await request(app).post("/auth/register-request").send(failUser);

        // 2. Attempt verification with a wrong code
        const res = await request(app).post("/auth/verify-registration").send({
          email: failUser.email,
          confirmationCode: "999999", // Incorrect code
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain("Invalid confirmation code.");

        // Manual cleanup for failed attempt
        await redisClient.del(`temp_user:${failUser.email}`);
      });

      /**
       * @description Test failure when the request is not found in Redis (expired or never requested).
       * @returns {number} 404 Not Found.
       */
      it("should fail if the registration request has expired or not found (404)", async () => {
        const res = await request(app)
          .post("/auth/verify-registration")
          .send({
            email: `expired-${Date.now() + 2}@example.com`,
            confirmationCode: "123456",
          });

        expect(res.statusCode).toBe(404);
        expect(res.body.message).toContain(
          "Registration request not found or has expired"
        );
      });
    });
  });

  // --- LOGIN/SESSION/LOGOUT TESTS ---

  describe("POST /auth/login", () => {
    /**
     * @description Test successful login for the pre-created user.
     * @returns {number} 200 OK.
     */
    it("should login successfully (200) and store session cookie", async () => {
      const res = await request(app).post("/auth/login").send({
        username: userForLoginTests.username,
        password: userForLoginTests.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);

      // Store the cookie for subsequent tests
      citizenCookie = res.headers["set-cookie"];
      expect(citizenCookie).toBeDefined();
    });

    /**
     * @description Test login failure with invalid credentials.
     * @returns {number} 401 Unauthorized.
     */
    it("should fail login with invalid credentials (401)", async () => {
      const res = await request(app).post("/auth/login").send({
        username: userForLoginTests.username,
        password: "WrongPassword123",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /auth/session", () => {
    /**
     * @description Test session retrieval for the authenticated Admin user.
     * @returns {number} 200 OK.
     */
    it("should return session info (200) for the authenticated Admin user", async () => {
      const res = await request(app)
        .get("/auth/session")
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.username).toBe(adminLogin.username);
    });

    /**
     * @description Test session retrieval for the pre-created citizen.
     * @returns {number} 200 OK.
     */
    it("should return session info (200) for the authenticated Citizen user (pre-created)", async () => {
      const res = await request(app)
        .get("/auth/session")
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.username).toBe(userForLoginTests.username);
    });

    /**
     * @description Test session retrieval for the newly registered and verified citizen.
     * @returns {number} 200 OK.
     */
    it("should return session info (200) for the newly verified Citizen user", async () => {
      const res = await request(app)
        .get("/auth/session")
        .set("Cookie", verifiedUserCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.username).toBe(userForVerificationFlow.username);
    });

    /**
     * @description Test session check failure when unauthenticated.
     * @returns {number} 401 Unauthorized.
     */
    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/auth/session");
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /auth/logout", () => {
    /**
     * @description Test successful session termination.
     * @returns {number} 204 No Content.
     */
    it("should logout the citizen successfully (204)", async () => {
      const res = await request(app)
        .post("/auth/logout")
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(204);

      // Verify that the session is terminated
      const checkRes = await request(app)
        .get("/auth/session")
        .set("Cookie", citizenCookie);
      expect(checkRes.statusCode).toBe(401);
    });
  });
});
