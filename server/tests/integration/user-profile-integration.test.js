/**
 * @file Integration Test for Citizen Profile Configuration
 * @description Tests profile update operations (PUT /users/me),
 * including data validation, security checks, and photo upload endpoints.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";

// --- Import Test Utilities ---
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  citizenLogin,
} from "./test-utils.js";

/** @type {string} Cookie for the authenticated Citizen user. */
let citizenCookie;

// --- Setup & Teardown Hooks ---

/**
 * @description Ensures a clean database, seeds data, and logs in the default citizen.
 */
beforeAll(async () => {
  await setupTestDatabase();
  // Use utility function for standard citizen login
  citizenCookie = await loginAndGetCookie(citizenLogin);
  expect(citizenCookie).toBeDefined();
});

/**
 * @description Closes the database connection.
 */
afterAll(async () => {
  await teardownTestDatabase();
});

describe("Citizen Profile Configuration - Integration Tests", () => {
  const PROFILE_ENDPOINT = "/users/me";

  // --- Profile Update Tests ---

  it("should update telegram username and return sanitized profile (200)", async () => {
    /** @description Updates a public profile field and validates response sanitization. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "myTelegram" });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBe("myTelegram");
    // Sensitive information check
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).not.toHaveProperty("refreshToken");
  });

  it("should allow removing telegram username by sending null (200)", async () => {
    /** @description Accepts null value to clear a profile attribute. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: null });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBeNull();
  });

  it("should toggle email notifications (200)", async () => {
    /** @description Updates a boolean preference field. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ emailNotificationsEnabled: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.emailNotificationsEnabled).toBe(false);
  });

  // --- Validation Rules ---

  it("should return 400 if no valid fields are provided", async () => {
    /** @description Rejects request if the payload contains no updatable fields. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("should reject invalid telegram username format (400)", async () => {
    /** @description Rejects request due to format/validation error */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "" });

    expect(res.statusCode).toBe(400);
  });

  // --- Security behavior ---

  it("should return 401 if not authenticated", async () => {
    /** @description Profile updates require a valid session cookie. */
    const res = await request(app).put(PROFILE_ENDPOINT).send({
      telegramUsername: "test123",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should update multiple profile fields together (200)", async () => {
    /** @description Confirms support for patching multiple fields in one request. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "abc", emailNotificationsEnabled: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBe("abc");
    expect(res.body.emailNotificationsEnabled).toBe(true);
  });

  it("should never expose sensitive fields in the response", async () => {
    /** @description Final re-validation of sensitive field filtering on update response. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "safeUser" });

    expect(res.statusCode).toBe(200);

    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).not.toHaveProperty("refreshToken");
  });
});
