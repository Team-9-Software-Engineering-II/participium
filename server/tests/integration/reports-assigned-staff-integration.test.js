/**
 * @file Integration Test for Reports API (Technical Staff Flow)
 * @description Tests access control and filtering logic for reports assigned
 * to a specific Technical Officer via the /offices/reports/assigned endpoint.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";

// --- Import Test Utilities ---
import db from "../../models/index.mjs";
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  findAnotherTechnicalOfficer,
  citizenLogin, // 'mario.rossi' credentials
} from "./test-utils.js";

/** @type {string} Cookie for the authorized Technical Officer. */
let officerCookie;
/** @type {object} Login credentials for the Technical Officer in this test. */
const technicalOfficerLogin = {
  username: "tech_water",
  password: "password123",
};

/**
 * @type {number} ID of a report assigned to the logged-in officer.
 */
let ASSIGNED_TO_OFFICER_ID;
/**
 * @type {number} ID of a report assigned to another officer.
 */
let NOT_ASSIGNED_REPORT_ID;

// --- Setup & Teardown Hooks ---

/**
 * @description Sets up the database, creates test reports, and logs in the officer.
 */
beforeAll(async () => {
  await setupTestDatabase();

  // 1. Setup necessary actors
  const officerUser = await db.User.findOne({
    where: { username: technicalOfficerLogin.username },
  });
  // Use utility function to find the other officer
  const anotherOfficer = await findAnotherTechnicalOfficer(
    technicalOfficerLogin.username
  );

  // Use standard citizen data from utility
  const citizenUser = await db.User.findOne({
    where: { username: citizenLogin.username },
  });
  const category = await db.Category.findOne();

  // 2. Log in as technical staff using utility
  officerCookie = await loginAndGetCookie(technicalOfficerLogin);
  expect(officerCookie).toBeDefined();

  // 3. Create a report assigned to the logged-in officer
  const assignedReport = await db.Report.create({
    title: "Test Water Pipe Leak",
    description: "Pipe leaking in main street",
    status: "Assigned",
    technicalOfficerId: officerUser.id,
    latitude: 45,
    longitude: 9,
    userId: citizenUser.id,
    categoryId: category.id,
    anonymous: false,
  });
  ASSIGNED_TO_OFFICER_ID = assignedReport.id;

  // 4. Create a report assigned to another officer
  const otherReport = await db.Report.create({
    title: "Other Issue",
    description: "Unrelated report",
    status: "Assigned",
    technicalOfficerId: anotherOfficer.id,
    latitude: 46,
    longitude: 10,
    userId: citizenUser.id,
    categoryId: category.id,
    anonymous: true,
  });
  NOT_ASSIGNED_REPORT_ID = otherReport.id;
});

/**
 * @description Cleans up the database connection after all tests.
 */
afterAll(async () => {
  await teardownTestDatabase();
});

describe("API Map Data Visualization (Technical Staff Flow) E2E", () => {
  const ENDPOINT = "/offices/reports/assigned";

  it("should retrieve only reports assigned to the logged-in officer (200)", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const reportIds = res.body.map((r) => r.id);
    expect(reportIds).toContain(ASSIGNED_TO_OFFICER_ID);
    expect(reportIds).not.toContain(NOT_ASSIGNED_REPORT_ID);
  });

  it("should include essential fields for maintenance overview", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);

    const report = res.body[0];
    expect(report).toHaveProperty("title");
    expect(report).toHaveProperty("status");
    expect(report).toHaveProperty("latitude");
    expect(report).toHaveProperty("longitude");
    expect(typeof report.latitude).toBe("number");
  });

  it("should mask anonymous reporters", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);

    for (const report of res.body) {
      if (report.anonymous) {
        expect(report.reporterName).toBe("Anonymous");
      } else {
        expect(typeof report.reporterName).toBe("string");
      }
    }
  });

  it("should return 401 if not logged in", async () => {
    const res = await request(app).get(ENDPOINT);
    expect(res.statusCode).toBe(401);
  });

  it("other officers should not see reports not assigned to them", async () => {
    const otherOfficer = await findAnotherTechnicalOfficer(
      technicalOfficerLogin.username
    );

    // Log in the other officer using utility
    const otherOfficerCookie = await loginAndGetCookie({
      username: otherOfficer.username,
      password: "password123",
    });

    const res = await request(app)
      .get(ENDPOINT)
      .set("Cookie", otherOfficerCookie);
    const reportIds = res.body.map((r) => r.id);

    // This officer should see NOT_ASSIGNED_REPORT_ID but not ASSIGNED_TO_OFFICER_ID
    expect(reportIds).not.toContain(ASSIGNED_TO_OFFICER_ID);
    expect(reportIds).toContain(NOT_ASSIGNED_REPORT_ID);
  });

  it("should return reports ordered by creation date descending", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);
    const dates = res.body.map((r) => new Date(r.createdAt));

    for (let i = 1; i < dates.length; i++) {
      // Check if current date is less than or equal to the previous date (descending)
      expect(dates[i].getTime()).toBeLessThanOrEqual(dates[i - 1].getTime());
    }
  });

  it("should include optional fields even if empty", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);
    for (const report of res.body) {
      expect(report).toHaveProperty("photos");
      expect(Array.isArray(report.photos)).toBe(true);
    }
  });

  it("should return 403 if the user is logged in but not a technical staff", async () => {
    // Citizen user is available via citizenLogin from test-utils.js
    const citizenCookie = await loginAndGetCookie(citizenLogin);
    expect(citizenCookie).toBeDefined();

    const res = await request(app).get(ENDPOINT).set("Cookie", citizenCookie);
    expect(res.statusCode).toBe(403);
  });

  it("should return the correct number of reports assigned to the logged-in officer", async () => {
    const officer = await db.User.findOne({
      where: { username: technicalOfficerLogin.username },
    });

    const assignedReportsCount = await db.Report.count({
      where: { technicalOfficerId: officer.id },
    });

    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(assignedReportsCount);
  });

  // File upload tests remain, assuming these endpoints are also secured by officerCookie

  it("should return 400 if uploaded file exceeds size limit", async () => {
    const res = await request(app)
      .post("/upload/photo")
      .set("Cookie", officerCookie)
      .attach("photo", Buffer.alloc(6 * 1024 * 1024), "large-file.jpg");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      "message",
      "File size too large. Maximum size is 5MB."
    );
  });

  it("should return 400 if uploaded files exceed count limit", async () => {
    const res = await request(app)
      .post("/upload/photos")
      .set("Cookie", officerCookie)
      .attach("photos", Buffer.from("file1"), "file1.jpg")
      .attach("photos", Buffer.from("file2"), "file2.jpg")
      .attach("photos", Buffer.from("file3"), "file3.jpg")
      .attach("photos", Buffer.from("file4"), "file4.jpg");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Unexpected file field.");
  });

  it("should return 400 if uploaded file has unexpected field name", async () => {
    const res = await request(app)
      .post("/upload/photo")
      .set("Cookie", officerCookie)
      .attach("unexpectedField", Buffer.from("dummy"), "file.jpg");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Unexpected file field.");
  });
});
