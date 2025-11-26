process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";
import db from "../../models/index.mjs";

/** @type {string} Cookie for the authorized Public Relations Officer (PR Officer / Role ID 3). */
let prOfficerCookie;
/** @type {string} Cookie for a standard Citizen user. */
let citizenCookie;

// --- Seeded Report IDs (defined in seedReports) ---
const PENDING_REPORT_ID_1 = 1; // Used for Rejection test
const PENDING_REPORT_ID_2 = 2; // Used for Assignment test
const ASSIGNED_REPORT_ID_3 = 3;
const IN_PROGRESS_REPORT_ID_4 = 4;
const REJECTED_REPORT_ID_6 = 6;

// --- Setup & Teardown Hooks ---

beforeAll(async () => {
  // Setup the database and run seeders before any test.
  await sequelize.sync({ force: true });
  await seedDatabase();

  // 1. Log in PR Officer (Authorized User)
  const prLoginRes = await request(app).post("/auth/login").send({
    username: "pr_officer", // Role ID 3
    password: "password123",
  });
  prOfficerCookie = prLoginRes.headers["set-cookie"];

  // 2. Log in Standard Citizen (Unauthorized User)
  const citizenLoginRes = await request(app).post("/auth/login").send({
    username: "mario.rossi",
    password: "password123",
  });
  citizenCookie = citizenLoginRes.headers["set-cookie"];

  expect(prOfficerCookie).toBeDefined();
  expect(citizenCookie).toBeDefined();
});

afterAll(async () => {
  // Close database connection after all tests complete.
  if (sequelize) {
    await sequelize.close();
  }
});

// --- Main Integration Test Suite ---

describe("Reports API Integration (Public Relations Officer Flow)", () => {
  // Base URL prefix for all PR Officer/Municipal reports
  const BASE_URL = "/municipal/reports";

  // =======================================================
  // A. Access and Security Tests
  // =======================================================
  describe(`GET ${BASE_URL}/pending & General Security`, () => {
    it("should return 403 Forbidden if a standard Citizen tries to access the pending reports queue (GET)", async () => {
      // @param {string} url - /municipal/reports/pending
      const res = await request(app)
        .get(`${BASE_URL}/pending`)
        .set("Cookie", citizenCookie);

      // Expect Citizen to be authenticated but unauthorized (403).
      expect(res.statusCode).toBe(403);
    });

    it("should return 200 OK and the list of pending reports for the authorized PR Officer (GET)", async () => {
      // @param {string} url - /municipal/reports/pending
      const res = await request(app)
        .get(`${BASE_URL}/pending`)
        .set("Cookie", prOfficerCookie);

      // Verify success and data structure
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((r) => r.id === PENDING_REPORT_ID_1)).toBe(true);
      expect(res.body[0].status).toBe("Pending Approval");
    });

    it("should return 401 Unauthorized if no credentials are provided for review action (PUT)", async () => {
      // @param {string} url - /municipal/reports/:reportId
      const res = await request(app)
        .put(`${BASE_URL}/${IN_PROGRESS_REPORT_ID_4}`)
        .send({ action: "rejected", rejectionReason: "Unauthorized Test" });

      expect(res.statusCode).toBe(401);
    });

    it("should return 403 Forbidden if a standard Citizen tries to perform a review action (PUT)", async () => {
      // @param {string} url - /municipal/reports/:reportId
      const res = await request(app)
        .put(`${BASE_URL}/${IN_PROGRESS_REPORT_ID_4}`)
        .set("Cookie", citizenCookie)
        .send({ action: "assigned" });

      expect(res.statusCode).toBe(403);
    });
  });

  // =======================================================
  // B. Reject Flow Tests (Happy Path & Validation)
  // =======================================================
  describe(`PUT ${BASE_URL}/:reportId (Reject Flow)`, () => {
    const reportId = PENDING_REPORT_ID_1;
    const reviewUrl = `${BASE_URL}/${reportId}`;
    const rejectionReason = "Not relevant to municipal jurisdiction.";

    it("should successfully reject the report and save the mandatory reason (200)", async () => {
      // @param {string} payload - { action: "rejected", rejectionReason: string }
      const res = await request(app)
        .put(reviewUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "rejected", rejectionReason });

      // Verify API response
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("Rejected");
      expect(res.body.rejectionReason).toBe(rejectionReason); // Sanitization success

      // Verify Database integrity
      const reportInDb = await db.Report.findByPk(reportId);
      expect(reportInDb.status).toBe("Rejected");
      expect(reportInDb.rejection_reason).toBe(rejectionReason);
      expect(reportInDb.technicalOfficerId).toBeNull(); // Clean up if it was previously assigned
    });

    it("should return 400 Bad Request if trying to reject without a rejectionReason", async () => {
      const reportId = PENDING_REPORT_ID_2; // Use Report ID 2 (still Pending)
      const pendingReportUrl = `${BASE_URL}/${reportId}`;

      const res = await request(app)
        .put(pendingReportUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "rejected", rejectionReason: "" }); // Empty reason

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(
        "Rejection reason is mandatory when rejecting a report."
      );

      // Verify Database state: status must remain 'Pending Approval'
      const reportInDb = await db.Report.findByPk(reportId);
      expect(reportInDb.status).toBe("Pending Approval");
    });

    it("should successfully reject an ANONYMOUS report and retain its anonymity (200)", async () => {
      // Report ID 2 is Anonymous, needs to be pending first (resets in previous test)
      const anonymousReportId = PENDING_REPORT_ID_2;
      const anonymousReportUrl = `${BASE_URL}/${anonymousReportId}`;
      const reason = "Anonymous report lacked sufficient detail.";

      // Since the previous test leaves it pending, we can proceed with rejection.
      const res = await request(app)
        .put(anonymousReportUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "rejected", rejectionReason: reason });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("Rejected");
      expect(res.body.anonymous).toBe(true);
      expect(res.body.reporterName).toBe("Anonymous");
    });
  });

  // =======================================================
  // C. Assignment Flow Tests (Happy Path & Load Balancing)
  // =======================================================
  describe(`PUT ${BASE_URL}/:reportId (Assignment Flow)`, () => {
    const reportId = PENDING_REPORT_ID_2;
    const reviewUrl = `${BASE_URL}/${reportId}`;

    beforeAll(async () => {
      // Reset Report 2 to 'Pending Approval' for assignment tests
      await db.Report.update(
        { status: "Pending Approval", rejection_reason: null },
        { where: { id: reportId } }
      );
    });

    it("should successfully approve, assign via Load Balancing, and clear rejection data (200)", async () => {
      // @param {string} payload - { action: "assigned" }
      const res = await request(app)
        .put(reviewUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "assigned" });

      // Verify API response
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("Assigned");
      expect(res.body).toHaveProperty("technicalOfficerId");
      expect(res.body.technicalOfficerId).toBeDefined();

      // Verify Database integrity
      const reportInDb = await db.Report.findByPk(reportId);
      expect(reportInDb.status).toBe("Assigned");
      expect(reportInDb.technicalOfficerId).toBe(res.body.technicalOfficerId);
      expect(reportInDb.rejection_reason).toBeNull();
    });

    it("should return 404 Not Found if the report does not exist", async () => {
      // @param {number} reportId - 999999 (non-existent)
      const res = await request(app)
        .put(`${BASE_URL}/999999`)
        .set("Cookie", prOfficerCookie)
        .send({ action: "assigned" });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Report not found.");
    });
  });

  // =======================================================
  // D. State Conflict and Validation Tests
  // =======================================================
  describe("State Conflict and Advanced Validation", () => {
    // --- State Conflict Tests ---

    it("should return 400 Bad Request if trying to reject a report already 'In Progress'", async () => {
      // @param {number} reportId - IN_PROGRESS_REPORT_ID_4
      const inProgressReportUrl = `${BASE_URL}/${IN_PROGRESS_REPORT_ID_4}`;
      const res = await request(app)
        .put(inProgressReportUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "rejected", rejectionReason: "Late rejection" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "Cannot reject report. Current status is 'In Progress'"
      );
    });

    it("should return 400 Bad Request if trying to approve a report that is already 'Rejected'", async () => {
      // @param {number} reportId - REJECTED_REPORT_ID_6
      const rejectedReportUrl = `${BASE_URL}/${REJECTED_REPORT_ID_6}`;
      const res = await request(app)
        .put(rejectedReportUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "assigned" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "Cannot accept report. Current status is 'Rejected'"
      );
    });

    it("should return 400 Bad Request if trying to approve a report not in 'Pending Approval' state (Assigned)", async () => {
      // @param {number} reportId - ASSIGNED_REPORT_ID_3
      const assignedReportUrl = `${BASE_URL}/${ASSIGNED_REPORT_ID_3}`;
      const res = await request(app)
        .put(assignedReportUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "assigned" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "Cannot accept report. Current status is 'Assigned'"
      );
    });

    // --- Data Coherence Test ---
    it("should return 400 and block assignment if the report is in a terminal 'Rejected' state", async () => {
      const rejectedReportId = 6;
      const rejectedReportUrl = `${BASE_URL}/${rejectedReportId}`;

      const res = await request(app)
        .put(rejectedReportUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "assigned" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain(
        "Cannot accept report. Current status is 'Rejected'"
      );

      const reportInDb = await db.Report.findByPk(rejectedReportId);
      expect(reportInDb.status).toBe("Rejected");
    });

    // --- Invalid Action Test ---

    it("should return 400 Bad Request for an invalid or unknown action type in payload", async () => {
      // @param {string} payload - { action: "completed_by_magic" }
      const pendingReportUrl = `${BASE_URL}/${PENDING_REPORT_ID_2}`;

      const res = await request(app)
        .put(pendingReportUrl)
        .set("Cookie", prOfficerCookie)
        .send({ action: "completed_by_magic" }); // Invalid action

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe(
        "Invalid action. Allowed values: 'assigned', 'rejected'."
      );
    });
  });
});
