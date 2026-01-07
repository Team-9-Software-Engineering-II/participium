/**
 * @file Integration Test for POST /reports - Report Creation
 * @description Covers the full flow for a citizen creating a new report,
 * including security and validation checks.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import db from "../../models/index.mjs";

// --- Import Test Utilities ---
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  uniqueId,
  validReportPayload as defaultReportPayload,
} from "./test-utils.js";

// --- Global variables for storing session cookies and user data ---
/** @type {string} */
let cookie;
/** @type {number} */
let loggedInUserId;

// Define a test-specific user based on the imported uniqueId
/** @type {object} */
const citizenUser = {
  email: `citizen-${uniqueId}@example.com`,
  username: `citizen${uniqueId}`,
  firstName: "User",
  lastName: "Citizen",
  password: "Password123!",
};

// Use the standardized payload from test-utils, but local copy for modifications
/** @type {object} */
const validReportPayload = { ...defaultReportPayload };

// --- Test Hooks (Setup & Teardown) ---

/** @description Setup the test database and seed initial data. */
beforeAll(async () => {
  await setupTestDatabase();
});

/** @description Close the database connection. */
afterAll(async () => {
  await teardownTestDatabase();
});

/**
 * @description Preamble: User Authentication
 */
describe("Preamble: Authentication", () => {
  it("should register a new citizen user (201)", async () => {
    const res = await request(app).post("/auth/register").send(citizenUser);
    expect(res.statusCode).toBe(201);
    const userNode = await db.User.findOne({ where: { email: citizenUser.email } });
    const roleNode = await db.Role.findOne({ where: { name: "citizen" } });

    if (userNode && roleNode) {
      if (typeof userNode.addRole === "function") {
        await userNode.addRole(roleNode);
      } else if (typeof userNode.addRoles === "function") {
        await userNode.addRoles([roleNode]);
      } else if (typeof userNode.setRole === "function") {
        await userNode.setRole(roleNode);
      } else {
        if (userNode.dataValues.hasOwnProperty('roleId') || userNode.rawAttributes?.hasOwnProperty('roleId')) {
           await userNode.update({ roleId: roleNode.id });
        }
      }
    }
  });

  it("should login as the new citizen and store the cookie and user ID (200)", async () => {
    const loginCredentials = {
      username: citizenUser.username,
      password: citizenUser.password,
    };

    // Use the utility function to get the cookie
    cookie = await loginAndGetCookie(loginCredentials);
    expect(cookie).toBeDefined();

    // Perform a second request or check the body from a standard login flow
    // The utility function only returns the cookie, so we log in again to get the ID
    const res = await request(app).post("/auth/login").send(loginCredentials);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("authenticated", true);

    loggedInUserId = res.body.user.id;
    expect(loggedInUserId).toBeDefined();
  });
});

describe("POST /reports (Integration Test)", () => {
  describe("Happy Path (User Story Success)", () => {
    it("should create an anonymous report successfully (201)", async () => {
      // 1. Prepare payload with anonymous flag set to true
      const anonymousPayload = {
        ...validReportPayload,
        title: "Anonymous Hazard",
        anonymous: true,
      };

      // 2. Send request
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(anonymousPayload);

      // 3. Assertions
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe(anonymousPayload.title);

      // Verify the anonymous flag is persisted and returned
      expect(res.body.anonymous).toBe(true);

      // Even if anonymous, the system tracks the creator internally (checked via response body here)
      expect(res.body.user.id).toBe(loggedInUserId);
    });

    it("should create a new report successfully (201)", async () => {
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(validReportPayload);

      expect(res.statusCode).toBe(201);

      // Verify returned data matches the payload and defaults
      expect(res.body.title).toBe(validReportPayload.title);
      expect(res.body.description).toBe(validReportPayload.description);
      expect(res.body.latitude).toBe(validReportPayload.latitude);

      expect(res.body.status).toBe("Pending Approval");
      expect(res.body.photos).toEqual(validReportPayload.photos);

      // Verify foreign key associations are correctly populated
      expect(res.body.user.id).toBe(loggedInUserId);
      expect(res.body.category.id).toBe(validReportPayload.categoryId);
      // NOTE: This check assumes the category ID 7 corresponds to this specific name.
      expect(res.body.category.name).toBe("Roads and Urban Furnishings");
    });
  });

  describe("Sad Paths (Security & Validation)", () => {
    it("should fail to create a report without authentication (401)", async () => {
      const res = await request(app).post("/reports").send(validReportPayload);

      expect(res.statusCode).toBe(401);
    });

    it("should fail with missing 'title' (400)", async () => {
      const payload = { ...validReportPayload, title: "" };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Title is required.");
    });

    it("should fail with invalid 'categoryId' type (400)", async () => {
      const payload = { ...validReportPayload, categoryId: "not-a-number" };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Valid categoryId is required.");
    });

    it("should fail with invalid 'latitude' value (400)", async () => {
      const payload = { ...validReportPayload, latitude: 200 }; // Value > 90
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "Latitude must be a number between -90 and 90."
      );
    });

    it("should fail if 'photos' array is empty (min 1) (400)", async () => {
      const payload = { ...validReportPayload, photos: [] }; // 0 photos
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "Photos array must contain between 1 and 3 items."
      );
    });

    it("should fail if 'photos' array has too many items (max 3) (400)", async () => {
      const payload = {
        ...validReportPayload,
        photos: ["foto1.jpg", "foto2.jpg", "foto3.jpg", "foto4.jpg"], // 4 photos
      };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "Photos array must contain between 1 and 3 items."
      );
    });

    it("should fail if 'categoryId' does not exist in the DB (404)", async () => {
      const payload = { ...validReportPayload, categoryId: 9999 };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      // Changed status code expectation based on typical foreign key/resource lookup failure
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Category with id "9999" not found.');
    });
  });
});
