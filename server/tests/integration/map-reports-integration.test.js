/**
 * @file Integration Test for Map Data Visualization (Citizen Flow)
 * @description Tests the visibility, filtering, and data structure of reports
 * exposed via the /reports/assigned endpoint, which serves map data.
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
  citizenLogin, // Default user credentials from seeders
} from "./test-utils.js";

/** @type {string} Cookie for a standard Citizen user. */
let citizenCookie;

// --- Seeded Data Reference (Assumed to be set by seedDatabase) ---
const PENDING_REPORT_ID = 1;
const ASSIGNED_REPORT_ID = 3;
const IN_PROGRESS_REPORT_ID = 4;

// --- Setup & Teardown ---

/**
 * @description Resets and seeds the database, then logs in the default citizen.
 */
beforeAll(async () => {
  await setupTestDatabase();
  citizenCookie = await loginAndGetCookie(citizenLogin);
  expect(citizenCookie).toBeDefined();
});

/**
 * @description Closes the database connection.
 */
afterAll(async () => {
  await teardownTestDatabase();
});

describe("API Map Data Visualization (Citizen Flow) E2E", () => {
  const MAP_DATA_ENDPOINT = "/reports/assigned";

  // =======================================================
  // 1. Visibility & Filtering Tests
  // =======================================================
  describe("Report Visibility on Map", () => {
    it("should retrieve ONLY reports with 'Assigned' status (200)", async () => {
      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
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
        .get(MAP_DATA_ENDPOINT)
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
    it("should ensure every returned report has valid geolocation coordinates", async () => {
      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(200);

      for (const report of res.body) {
        expect(report).toHaveProperty("latitude");
        expect(report).toHaveProperty("longitude");
        expect(typeof report.latitude).toBe("number");
        expect(report.latitude).not.toBe(0);
      }
    });

    it("should include Title and Status for report visualization", async () => {
      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
        .set("Cookie", citizenCookie);

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
      // Report ID 3 is NOT anonymous
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

      // Temporarily update report status to 'Assigned'
      await db.Report.update(
        { status: "Assigned" },
        { where: { id: anonReportId } }
      );

      const res = await request(app)
        .get(MAP_DATA_ENDPOINT)
        .set("Cookie", citizenCookie);

      const anonReport = res.body.find((r) => r.id === anonReportId);

      expect(anonReport).toBeDefined();
      expect(anonReport.status).toBe("Assigned");
      expect(anonReport.anonymous).toBe(true);
      expect(anonReport.reporterName).toBe("Anonymous");

      // Reset the report status
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
    it("should allow a Citizen to view details of an 'Assigned' report (200)", async () => {
      const res = await request(app)
        .get(`/reports/${ASSIGNED_REPORT_ID}`)
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(ASSIGNED_REPORT_ID);
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
        expect(report.user).not.toHaveProperty("password");
      }
    });
  });
});
