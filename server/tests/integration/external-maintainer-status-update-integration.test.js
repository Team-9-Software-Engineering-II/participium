/**
 * @file Integration Test for Reports API (External Maintainer Status Update Flow)
 * @description Tests the authorization, validation, and core functionality
 * of the PUT /external-maintainer/reports/:reportId/status endpoint.
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
  citizenLogin,
  technicalStaffLogin,
} from "./test-utils.js";

/** @type {string} Cookie for the authorized External Maintainer (SMAT). */
let externalMaintainerCookie;
/** @type {string} Cookie for an unauthorized Citizen. */
let citizenCookie;

/** @type {object} Login credentials for the External Maintainer (SMAT). */
const externalMaintainerLogin = {
  username: "em_water_smat",
  password: "password123",
};

/** @type {object} Login credentials for the Other External Maintainer (IREN). */
const anotherExternalMaintainerLogin = {
  username: "em_light_iren",
  password: "password123",
};

// Fixed IDs based on your Sequelize output showing 6 reports seeded initially:
/** @type {number} ID of the primary external maintainer (em_water_smat). */
let MAINTAINER_USER_ID = 6;
/** @type {number} ID of a report assigned to the primary external maintainer, starting at 'In Progress'. */
let REPORT_ASSIGNED_TO_ME_ID_IP = 900;
/** @type {number} ID of a report assigned to another external maintainer (IREN). */
let REPORT_ASSIGNED_TO_OTHER_ID = 901;
/** @type {number} ID of a report NOT assigned to any external maintainer (Tech Staff). */
let REPORT_NOT_ASSIGNED_ID = 902;
/** @type {number} ID of a valid report for status update, starting at 'Assigned'. */
let VALID_REPORT_ID_ASSIGNED = 903;

// --- Setup & Teardown Hooks ---

/**
 * @description Sets up the database, explicitly creating reports with hardcoded IDs
 */
beforeAll(async () => {
  await setupTestDatabase();

  // 1. Log in users
  externalMaintainerCookie = await loginAndGetCookie(externalMaintainerLogin);
  citizenCookie = await loginAndGetCookie(citizenLogin);

  // 2. Retrieve user IDs and force them to STRING for database insertion attempt
  const maintainerUser = await db.User.findOne({
    where: { username: externalMaintainerLogin.username },
  });
  MAINTAINER_USER_ID = maintainerUser.id;

  // 💡 Strategy: Convert the Maintainer ID to a string for insertion
  const MAINTAINER_USER_ID_AS_STRING = String(MAINTAINER_USER_ID);
  console.log(
    `SETUP DEBUG: Primary External Maintainer ID: ${MAINTAINER_USER_ID} (Used as string for insertion: ${MAINTAINER_USER_ID_AS_STRING})`
  );

  const anotherMaintainerUser = await db.User.findOne({
    where: { username: anotherExternalMaintainerLogin.username },
  });

  const citizenUser = await db.User.findOne({
    where: { username: citizenLogin.username },
  });

  const techStaffUser = await db.User.findOne({
    where: { username: technicalStaffLogin.username },
  });

  const categoryId = 1; // Water Supply
  const categoryIdLighting = 4; // Public Lighting
  const categoryIdRoads = 7; // Roads Maintenance

  // 3. Create reports manually, using the STRING ID for externalMaintainerId

  // R. ID 900: Assigned to me, In Progress
  await db.Report.create({
    id: 900,
    title: "EM Assigned Water Leak",
    description: "Assigned to SMAT",
    status: "In Progress",
    externalMaintainerId: maintainerUser.id,
    userId: citizenUser.id,
    categoryId: categoryId,
    latitude: 45,
    longitude: 9,
    anonymous: false,
  });
  REPORT_ASSIGNED_TO_ME_ID_IP = 900;

  // R. ID 901: Assigned to other EM (using numeric ID for comparison)
  await db.Report.create({
    id: 901,
    title: "Other EM Assigned Lighting Issue",
    description: "Assigned to IREN",
    status: "In Progress",
    externalMaintainerId: anotherMaintainerUser.id,
    userId: citizenUser.id,
    categoryId: categoryIdLighting,
    latitude: 46,
    longitude: 10,
    anonymous: false,
  });
  REPORT_ASSIGNED_TO_OTHER_ID = 901;

  // R. ID 902: Assigned to Tech Staff
  await db.Report.create({
    id: 902,
    title: "Tech Staff Road Issue",
    description: "Assigned to Technical Staff",
    status: "Assigned",
    technicalOfficerId: techStaffUser.id,
    userId: citizenUser.id,
    categoryId: categoryIdRoads,
    latitude: 47,
    longitude: 11,
    anonymous: false,
  });
  REPORT_NOT_ASSIGNED_ID = 902;

  // R. ID 903: Assigned to me, Assigned status (for 'In Progress' transition test)
  await db.Report.create({
    id: 903,
    title: "Fresh Assigned Report",
    description: "Ready for status update test",
    status: "Assigned",
    externalMaintainerId: maintainerUser.id,
    userId: citizenUser.id,
    categoryId,
    latitude: 45.1,
    longitude: 9.1,
    anonymous: false,
  });
  VALID_REPORT_ID_ASSIGNED = 903;

  console.log(
    `SETUP DEBUG: Report IDs: [Assigned/IP: ${REPORT_ASSIGNED_TO_ME_ID_IP}, Assigned: ${VALID_REPORT_ID_ASSIGNED}]`
  );
});

/**
 * @description Cleans up the database connection after all tests.
 */
afterAll(async () => {
  await teardownTestDatabase();
});

describe("PUT /external-maintainer/reports/:reportId/status E2E", () => {
  const ENDPOINT = (id) => `/external-maintainer/reports/${id}/status`;
  const PAYLOAD = (status) => ({ status });

  // --- Authorization and Access Control Failures ---

  it("should return 401 if user is not authenticated", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_ASSIGNED_TO_ME_ID_IP))
      .send(PAYLOAD("In Progress"));

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("User not authenticated");
  });

  it("should return 403 if user is a Citizen (not External Maintainer)", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_ASSIGNED_TO_ME_ID_IP))
      .set("Cookie", citizenCookie)
      .send(PAYLOAD("In Progress"));

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("Forbidden: external maintainer only");
  });

  it("should return 403 if External Maintainer tries to update a report assigned to another External Maintainer", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_ASSIGNED_TO_OTHER_ID))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("In Progress"));

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe(
      `You are not assigned to manage report with ID ${REPORT_ASSIGNED_TO_OTHER_ID}`
    );
  });

  it("should return 403 if External Maintainer tries to update a report assigned to Technical Staff", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_NOT_ASSIGNED_ID))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("In Progress"));

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe(
      `You are not assigned to manage report with ID ${REPORT_NOT_ASSIGNED_ID}`
    );
  });

  // --- Validation Failures ---

  it("should return 400 for a non-integer report ID", async () => {
    const res = await request(app)
      .put(ENDPOINT("abc"))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("In Progress"));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid report ID.");
  });

  it("should return 400 for a zero report ID", async () => {
    const res = await request(app)
      .put(ENDPOINT(0))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("In Progress"));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid report ID.");
  });

  it("should return 404 for a non-existent report ID", async () => {
    const nonExistentId = 99999;
    const res = await request(app)
      .put(ENDPOINT(nonExistentId))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("In Progress"));

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe(`Report with ID ${nonExistentId} not found`);
  });

  it("should return 400 if 'status' is missing in the body", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_ASSIGNED_TO_ME_ID_IP))
      .set("Cookie", externalMaintainerCookie)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain(
      "Invalid status. Allowed values: In Progress, Resolved, Suspended"
    );
  });

  it("should return 400 for an invalid status value (e.g., 'Assigned')", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_ASSIGNED_TO_ME_ID_IP))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("Assigned"));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain(
      "Invalid status. Allowed values: In Progress, Resolved, Suspended"
    );
  });

  it("should return 400 for an invalid status value (e.g., 'Rejected')", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_ASSIGNED_TO_ME_ID_IP))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("Rejected"));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain(
      "Invalid status. Allowed values: In Progress, Resolved, Suspended"
    );
  });

  it("should return 400 for a status value in wrong case", async () => {
    const res = await request(app)
      .put(ENDPOINT(REPORT_ASSIGNED_TO_ME_ID_IP))
      .set("Cookie", externalMaintainerCookie)
      .send(PAYLOAD("in progress"));

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain(
      "Invalid status. Allowed values: In Progress, Resolved, Suspended"
    );
  });
});
