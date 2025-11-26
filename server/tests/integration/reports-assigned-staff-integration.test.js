import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";
import db from "../../models/index.mjs";

let officerCookie;

/**
 * Example IDs for seeded reports
 * @type {number} ASSIGNED_TO_OFFICER_ID - ID of a report assigned to the logged-in officer
 * @type {number} NOT_ASSIGNED_REPORT_ID - ID of a report assigned to another officer
 */
let ASSIGNED_TO_OFFICER_ID;
let NOT_ASSIGNED_REPORT_ID;

/**
 * Setup the database and seed necessary data before all tests.
 * Creates two reports: one assigned to the logged-in officer, another to a different officer.
 */
beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedDatabase();

  // Get the logged-in technical officer
  const officerUser = await db.User.findOne({
    where: { username: "tech_water" },
  });

  // Get another officer to test access restrictions
  const anotherOfficer = await db.User.findOne({
    where: { roleId: 4, username: { [db.Sequelize.Op.ne]: "tech_water" } },
  });

  // Get any citizen to be the reporter
  const citizenUser = await db.User.findOne({ where: { roleId: 1 } });

  // Get a problem category
  const category = await db.Category.findOne();

  // Log in as technical staff
  const loginRes = await request(app).post("/auth/login").send({
    username: "tech_water",
    password: "password123",
  });
  officerCookie = loginRes.headers["set-cookie"];
  expect(officerCookie).toBeDefined();

  // Create a report assigned to the logged-in officer
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

  // Create a report assigned to another officer
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
 * Cleanup after all tests.
 */
afterAll(async () => {
  if (sequelize) await sequelize.close();
});

describe("API Map Data Visualization (Technical Staff Flow) E2E", () => {
  const ENDPOINT = "/offices/reports/assigned";

  /**
   * Test that only reports assigned to the logged-in officer are retrieved
   */
  it("should retrieve only reports assigned to the logged-in officer", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const reportIds = res.body.map((r) => r.id);
    expect(reportIds).toContain(ASSIGNED_TO_OFFICER_ID);
    expect(reportIds).not.toContain(NOT_ASSIGNED_REPORT_ID);
  });

  /**
   * Test that essential fields for maintenance overview are included
   */
  it("should include essential fields for maintenance overview", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);

    const report = res.body[0];
    expect(report).toHaveProperty("title");
    expect(report).toHaveProperty("status");
    expect(report).toHaveProperty("latitude");
    expect(report).toHaveProperty("longitude");
    expect(typeof report.latitude).toBe("number");
    expect(typeof report.longitude).toBe("number");
  });

  /**
   * Test that anonymous reporters are properly masked
   */
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

  /**
   * Test that unauthenticated users receive 401
   */
  it("should return 401 if not logged in", async () => {
    const res = await request(app).get(ENDPOINT);
    expect(res.statusCode).toBe(401);
  });

  /**
   * Test that other officers cannot see reports not assigned to them
   */
  it("other officers should not see reports not assigned to them", async () => {
    const otherOfficer = await db.User.findOne({
      where: { roleId: 4, username: { [db.Sequelize.Op.ne]: "tech_water" } },
    });

    const loginRes = await request(app).post("/auth/login").send({
      username: otherOfficer.username,
      password: "password123",
    });
    const otherOfficerCookie = loginRes.headers["set-cookie"];

    const res = await request(app)
      .get(ENDPOINT)
      .set("Cookie", otherOfficerCookie);
    const reportIds = res.body.map((r) => r.id);

    expect(reportIds).not.toContain(ASSIGNED_TO_OFFICER_ID);
    expect(reportIds).toContain(NOT_ASSIGNED_REPORT_ID);
  });

  /**
   * Test that reports are ordered by creation date descending
   */
  it("should return reports ordered by creation date descending", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);
    const dates = res.body.map((r) => new Date(r.createdAt));

    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] <= dates[i - 1]).toBe(true);
    }
  });

  /**
   * Test that optional fields (like photos) are included even if empty
   */
  it("should include optional fields even if empty", async () => {
    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);
    for (const report of res.body) {
      expect(report).toHaveProperty("photos");
      expect(Array.isArray(report.photos)).toBe(true);
    }
  });

  /**
   * Test that a logged-in citizen (non-technical staff) receives 403
   */
  it("should return 403 if the user is logged in but not a technical staff", async () => {
    const citizenUser = await db.User.findOne({ where: { roleId: 1 } });

    const loginRes = await request(app).post("/auth/login").send({
      username: citizenUser.username,
      password: "password123",
    });
    const citizenCookie = loginRes.headers["set-cookie"];
    expect(citizenCookie).toBeDefined();

    const res = await request(app).get(ENDPOINT).set("Cookie", citizenCookie);
    expect(res.statusCode).toBe(403);
  });

  /**
   * Test that the number of reports returned matches the number of assigned reports
   */
  it("should return the correct number of reports assigned to the logged-in officer", async () => {
    const officer = await db.User.findOne({
      where: { username: "tech_water" },
    });

    const assignedReportsCount = await db.Report.count({
      where: { technicalOfficerId: officer.id },
    });

    const res = await request(app).get(ENDPOINT).set("Cookie", officerCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(assignedReportsCount);
  });
  /**
   * Test that uploading a file exceeding the size limit returns a 400 with proper error message.
   */
  it("should return 400 if uploaded file exceeds size limit", async () => {
    const res = await request(app)
      .post("/upload/photo")
      .set("Cookie", officerCookie)
      .attach("photo", Buffer.alloc(6 * 1024 * 1024), "large-file.jpg"); // 6MB file

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      "message",
      "File size too large. Maximum size is 5MB."
    );
  });
  /**
   * Test that uploading more files than the allowed limit returns a 400 with proper error message.
   */
  it("should return 400 if uploaded files exceed count limit", async () => {
    const res = await request(app)
      .post("/upload/photos")
      .set("Cookie", officerCookie)
      .attach("photos", Buffer.from("file1"), "file1.jpg")
      .attach("photos", Buffer.from("file2"), "file2.jpg")
      .attach("photos", Buffer.from("file3"), "file3.jpg")
      .attach("photos", Buffer.from("file4"), "file4.jpg"); // 4th file exceeds limit of 3

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      "message",
      "Unexpected file field."
    );
  });

  /**
   * Test that uploading a file with an unexpected field name returns a 400 with proper error message.
   */
  it("should return 400 if uploaded file has unexpected field name", async () => {
    const res = await request(app)
      .post("/upload/photo")
      .set("Cookie", officerCookie)
      .attach("unexpectedField", Buffer.from("dummy"), "file.jpg");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("message", "Unexpected file field.");
  });
});
