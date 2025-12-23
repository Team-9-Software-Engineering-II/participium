import request from "supertest";
import { app } from "../../index.mjs";
import db from "../../models/index.mjs";
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
} from "./test-utils.js";

// --- TEST DATA ---

/** @type {object} Credentials for the default Technical Staff user (Roads Office, ID 7). */
const TECHNICAL_OFFICER_LOGIN = {
  username: "tech_roads", // ID 7: Andrea Blu (roleId 4, technicalOfficeId 7)
  password: "password123",
};

/** @type {object} Credentials for the External Maintainer (ID 14) */
const EXTERNAL_MAINTAINER_LOGIN = {
  username: "em_traffic_gtt", // ID 17: Federica Mancini (roleId 5, companyId 4)
  password: "password123",
};

/** @type {object} Credentials for a default Citizen user. */
const NON_PARTICIPANT_LOGIN = {
  username: "mario.rossi", // ID 1
  password: "password123",
};

// Report 3 is 'Assigned' in seed-reports.mjs but not assigned to the External Maintainer yet.
const REPORT_ID = 3;

// Company ID 4 (GTT) is the company assigned to the external maintainer used (em_traffic_gtt)
const EXTERNAL_COMPANY_ID = 4;

describe("Message Flow Integration Test (Technical Staff <-> External Maintainer)", () => {
  let officerCookie;
  let maintainerCookie;
  let nonParticipantCookie;
  let technicalOfficerId;
  let externalMaintainerId;

  beforeAll(async () => {
    await setupTestDatabase();

    // 1. Log in users and get cookies
    officerCookie = await loginAndGetCookie(TECHNICAL_OFFICER_LOGIN);
    maintainerCookie = await loginAndGetCookie(EXTERNAL_MAINTAINER_LOGIN);
    nonParticipantCookie = await loginAndGetCookie(NON_PARTICIPANT_LOGIN);

    // 2. Retrieve actual user IDs from DB
    const officerUser = await db.User.findOne({
      where: { username: TECHNICAL_OFFICER_LOGIN.username },
    });
    const maintainerUser = await db.User.findOne({
      where: { username: EXTERNAL_MAINTAINER_LOGIN.username },
    });
    technicalOfficerId = officerUser.id;
    externalMaintainerId = maintainerUser.id;

    // 3. Ensure REPORT_ID 3 is assigned to both for messaging flow
    await db.Report.update(
      {
        technicalOfficerId: technicalOfficerId,
        externalMaintainerId: externalMaintainerId,
        companyId: EXTERNAL_COMPANY_ID,
        status: "Assigned",
      },
      { where: { id: REPORT_ID } }
    );
  });

  afterAll(async () => {
    // Clean up created messages
    await db.Message.destroy({ where: { reportId: REPORT_ID } });
    await teardownTestDatabase();
  }, 10_000);

  // --- MESSAGE CREATION TESTS ---

  describe("POST /messages/reports/:reportId", () => {
    const messageFromOfficer =
      "Initial message from Technical Officer after external assignment.";
    const messageFromMaintainer = "Acknowledged. Starting work now.";

    test("should allow Technical Officer to send a message", async () => {
      const res = await request(app)
        .post(`/messages/reports/${REPORT_ID}`)
        .set("Cookie", officerCookie)
        .send({ content: messageFromOfficer });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.content).toBe(messageFromOfficer);
      expect(res.body.reportId).toBe(REPORT_ID);
      expect(res.body.author.id).toBe(technicalOfficerId);
    });

    test("should allow External Maintainer to reply to the message", async () => {
      const res = await request(app)
        .post(`/messages/reports/${REPORT_ID}`)
        .set("Cookie", maintainerCookie)
        .send({ content: messageFromMaintainer });

      expect(res.statusCode).toBe(201);
      expect(res.body.content).toBe(messageFromMaintainer);
      expect(res.body.author.id).toBe(externalMaintainerId);
    });

    test("should forbid message creation for non-participant user (Citizen)", async () => {
      const res = await request(app)
        .post(`/messages/reports/${REPORT_ID}`)
        .set("Cookie", nonParticipantCookie)
        .send({ content: "Unauthorized attempt." });

      // Middleware 'isReportParticipant' should block access
      expect(res.statusCode).toBe(403);
    });

    test("should forbid message creation for non-authenticated user", async () => {
      const res = await request(app)
        .post(`/messages/reports/${REPORT_ID}`)
        .send({ content: "Unauthorized attempt." });

      expect(res.statusCode).toBe(401);
    });

    test("should return 400 for an invalid report ID", async () => {
      const invalidId = "abc123";
      const res = await request(app)
        .post(`/messages/reports/${invalidId}`)
        .set("Cookie", officerCookie)
        .send({ content: "Unauthorized attempt." });
      expect(res.statusCode).toBe(400);
    });

    test("should return 404 for a non-existent report ID", async () => {
      const nonExistentId = 9999;
      const res = await request(app)
        .post(`/messages/reports/${nonExistentId}`)
        .set("Cookie", officerCookie)
        .send({ content: "Unauthorized attempt." });
      expect(res.statusCode).toBe(404);
    });

    test("should return 400 if content is missing", async () => {
      const res = await request(app)
        .post(`/messages/reports/${REPORT_ID}`)
        .set("Cookie", officerCookie)
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  // --- MESSAGE RETRIEVAL TESTS ---

  describe("GET /messages/reports/:reportId", () => {
    test("should allow Technical Officer to retrieve all messages for the report", async () => {
      const res = await request(app)
        .get(`/messages/reports/${REPORT_ID}`)
        .set("Cookie", officerCookie);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // We expect 2 messages from the previous POST tests
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Check message author details are included
      const officerMsg = res.body.find(
        (m) =>
          m.content ===
          "Initial message from Technical Officer after external assignment."
      );
      expect(officerMsg.author.id).toBe(technicalOfficerId);
    });

    test("should allow External Maintainer to retrieve all messages", async () => {
      const res = await request(app)
        .get(`/messages/reports/${REPORT_ID}`)
        .set("Cookie", maintainerCookie);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const maintainerMsg = res.body.find(
        (m) => m.content === "Acknowledged. Starting work now."
      );
      expect(maintainerMsg.author.id).toBe(externalMaintainerId);
    });

    test("should forbid non-participant user (Citizen) from retrieving messages (Service Check)", async () => {
      const res = await request(app)
        .get(`/messages/reports/${REPORT_ID}`)
        .set("Cookie", nonParticipantCookie);

      // Service layer check (MessageService.getReportMessages) should block 'citizen' role access
      expect(res.statusCode).toBe(403);
    });

    test("should return 404 for a non-existent report ID", async () => {
      const nonExistentId = 99999;
      const res = await request(app)
        .get(`/messages/reports/${nonExistentId}`)
        .set("Cookie", officerCookie);

      expect(res.statusCode).toBe(404);
    });

    test("should return 400 for an invalid report ID", async () => {
      const invalidId = "abc123";
      const res = await request(app)
        .get(`/messages/reports/${invalidId}`)
        .set("Cookie", officerCookie);

      expect(res.statusCode).toBe(400);
    });
  });
});
