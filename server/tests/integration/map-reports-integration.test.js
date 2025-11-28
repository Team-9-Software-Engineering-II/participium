process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";
import db from "../../models/index.mjs";

/** @type {string} Cookie for a standard Citizen user. */
let citizenCookie;

// --- Seeded Data Reference ---
const PENDING_REPORT_ID = 1; // Status: "Pending Approval" (Should be HIDDEN)
const ASSIGNED_REPORT_ID = 3; // Status: "Assigned" (Should be VISIBLE)
const IN_PROGRESS_REPORT_ID = 4; // Status: "In Progress" (Should be VISIBLE)

// --- Setup & Teardown ---

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedDatabase();

  // Log in as a Citizen to access the map data
  const citizenLoginRes = await request(app).post("/auth/login").send({
    username: "mario.rossi",
    password: "password123",
  });
  citizenCookie = citizenLoginRes.headers["set-cookie"];
});

afterAll(async () => {
  if (sequelize) {
    await sequelize.close();
  }
});

describe("API Map Data Visualization (Citizen Flow) E2E", () => {
  const MAP_DATA_ENDPOINT = "/reports/assigned";

  // =======================================================
  // 1. Visibility & Filtering Tests
  // =======================================================
  describe("Report Visibility on Map", () => {
    it("should retrieve ONLY reports with 'Assigned' status", async () => {
      const res = await request(app)
        .get("/reports/assigned")
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const reportIds = res.body.map((r) => r.id);

      expect(reportIds).toContain(ASSIGNED_REPORT_ID);

      expect(reportIds).not.toContain(IN_PROGRESS_REPORT_ID);
      expect(reportIds).not.toContain(PENDING_REPORT_ID);
    });

    it("should include coordinates (lat/long) for map placement", async () => {
      const res = await request(app)
        .get("/reports/assigned")
        .set("Cookie", citizenCookie);

      const report = res.body[0];

      expect(report).toHaveProperty("latitude");
      expect(report).toHaveProperty("longitude");
      expect(typeof report.latitude).toBe("number");
    });
  });

  // =======================================================
  // 2. Data Structure & Map Requirements
  // =======================================================
  describe("Map Data Structure Compliance", () => {
    it("should ensure every returned report has valid geolocation coordinates for placing markers", async () => {
      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(200);

      for (const report of res.body) {
        expect(report).toHaveProperty("latitude");
        expect(report).toHaveProperty("longitude");

        expect(typeof report.latitude).toBe("number");
        expect(typeof report.longitude).toBe("number");

        // Basic sanity check for coordinates
        expect(report.latitude).not.toBe(0);
        expect(report.longitude).not.toBe(0);
      };
    });

    it("should include Title for report visualization (Zoom In requirement)", async () => {
      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
        .set("Cookie", citizenCookie);

      // Check specifically the Assigned report
      const assignedReport = res.body.find((r) => r.id === ASSIGNED_REPORT_ID);

      expect(assignedReport).toBeDefined();
      expect(assignedReport).toHaveProperty("title");
      expect(assignedReport.title).toBeTruthy();

      expect(assignedReport).toHaveProperty("status");
    });
  });

  // =======================================================
  // 3. Privacy & Anonymity on Map
  // =======================================================
  describe("Reporter Anonymity Visualization", () => {
    it("should display the correct reporter name when the report is NOT anonymous", async () => {
      // Report ID 3 is NOT anonymous (User: Paolo Gialli)
      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
        .set("Cookie", citizenCookie);

      const publicReport = res.body.find((r) => r.id === ASSIGNED_REPORT_ID);

      expect(publicReport.anonymous).toBe(false);

      expect(publicReport.reporterName).not.toBe("Anonymous");
      expect(typeof publicReport.reporterName).toBe("string");
    });

    it("should mask the reporter name as 'Anonymous' when the anonymous flag is true", async () => {
      const anonReportId = 2;

      await db.Report.update(
        { status: "Assigned" },
        { where: { id: anonReportId } }
      );

      const res = await request(app)
        .get("/reports/assigned")
        .set("Cookie", citizenCookie);

      const anonReport = res.body.find((r) => r.id === anonReportId);

      expect(anonReport).toBeDefined();
      expect(anonReport.status).toBe("Assigned");

      expect(anonReport.anonymous).toBe(true);
      expect(anonReport.reporterName).toBe("Anonymous");

      await db.Report.update(
        { status: "Pending Approval" },
        { where: { id: anonReportId } }
      );
    });
  });

  // =======================================================
  // 4. Single Report Details (Zoom In Interaction)
  // =======================================================
  describe("GET /reports/:reportId (Public Details)", () => {
    it("should allow a Citizen to view details of an 'Assigned' report", async () => {
      const res = await request(app)
        .get(`/reports/${ASSIGNED_REPORT_ID}`)
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(ASSIGNED_REPORT_ID);
      expect(res.body.title).toBeTruthy();
      expect(res.body.description).toBeTruthy();

      expect(res.body.status).toBe("Assigned");
    });

    it("should NOT expose sensitive internal fields in public endpoints", async () => {
      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
        .set("Cookie", citizenCookie);

      const report = res.body[0];

      expect(report.rejectionReason).toBeFalsy();

      if (report.user) {
        expect(report.user).not.toHaveProperty("hashedPassword");
        expect(report.user).not.toHaveProperty("roleId");
      }
    });
  });
});
