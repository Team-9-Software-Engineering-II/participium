/**
 * @file Integration Test: Report Status Update & Notifications
 * @description Validates the workflow for Technical Staff to update report statuses and communicate with citizens.
 * Covers:
 * - Status transitions (In Progress, Resolved).
 * - Automatic notification generation for the report owner.
 * - Messaging functionality.
 * - Access control (assigned staff only).
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../../index.mjs";
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  validReportPayload,
  technicalStaffLogin,
  citizenLogin,
} from "./test-utils.js";
import db from "../../models/index.mjs";
import bcrypt from "bcrypt";

// --- Global Test Data ---

/** @type {string} Session cookie for the assigned Technical Staff */
let staffCookie;
/** @type {string} Session cookie for the Citizen (Report Owner) */
let citizenCookie;
/** @type {number} ID of the test report */
let reportId;
/** @type {number} ID of the Citizen user */
let citizenUserId;
/** @type {number} ID of the Technical Staff user */
let staffUserId;

describe("Technical Staff: Report Status & Communication", () => {
  /**
   * @description Initializes the test database, authenticates users, and seeds
   * a report in 'Assigned' status linked to the test staff member.
   */
  beforeAll(async () => {
    await setupTestDatabase();

    // 1. Authenticate Users
    staffCookie = await loginAndGetCookie(technicalStaffLogin);
    citizenCookie = await loginAndGetCookie(citizenLogin);

    // Retrieve DB IDs
    const citizenUser = await db.User.findOne({
      where: { username: citizenLogin.username },
    });
    citizenUserId = citizenUser.id;

    const staffUser = await db.User.findOne({
      where: { username: technicalStaffLogin.username },
    });
    staffUserId = staffUser.id;

    // 2. Seed Report (Status: Assigned)
    const report = await db.Report.create({
      ...validReportPayload,
      userId: citizenUserId,
      status: "Assigned",
      technicalOfficerId: staffUserId,
      categoryId: 1,
    });
    reportId = report.id;
  });

  /**
   * @description Cleans up database resources.
   */
  afterAll(async () => {
    await teardownTestDatabase();
  });

  // ------------------------------------------------------------------------
  // Happy Path: Status Updates & Notifications
  // ------------------------------------------------------------------------

  /**
   * @test {PUT} /offices/reports/:id/status
   * @description Verifies that updating status to 'In Progress' persists the change
   * and generates a notification for the citizen.
   */
  it("should update report status to 'In Progress' and create a notification", async () => {
    const payload = { status: "In Progress" };

    const res = await request(app)
      .put(`/offices/reports/${reportId}/status`)
      .set("Cookie", staffCookie)
      .send(payload);

    // Verify API Response
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("In Progress");

    // Verify DB Persistence
    const updatedReport = await db.Report.findByPk(reportId);
    expect(updatedReport.status).toBe("In Progress");

    // Verify Notification
    const notification = await db.Notification.findOne({
      where: {
        userId: citizenUserId,
        reportId: reportId,
        type: "REPORT_STATUS_CHANGE",
      },
    });

    expect(notification).toBeDefined();
    expect(notification.isRead).toBe(false);
    // Expect localized string "in lavorazione"
    expect(notification.message).toContain("lavorazione");
  });

  /**
   * @test {PUT} /offices/reports/:id/status
   * @description Verifies that updating status to 'Resolved' works correctly
   * and triggers a specific resolution notification.
   */
  it("should update report status to 'Resolved' and create a resolution notification", async () => {
    const payload = { status: "Resolved" };

    const res = await request(app)
      .put(`/offices/reports/${reportId}/status`)
      .set("Cookie", staffCookie)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("Resolved");

    // Verify Notifications (Expect multiple: In Progress + Resolved)
    const notifications = await db.Notification.findAll({
      where: {
        userId: citizenUserId,
        reportId: reportId,
        type: "REPORT_STATUS_CHANGE",
      },
      order: [["createdAt", "DESC"]],
    });

    expect(notifications.length).toBeGreaterThanOrEqual(2);
    // Expect localized string "risolta" in the newest notification
    expect(notifications[0].message).toContain("risolta");
  });

  // ------------------------------------------------------------------------
  // Happy Path: Messaging
  // ------------------------------------------------------------------------

  /**
   * @test {POST} /messages/reports/:id
   * @description Verifies that the assigned technical staff can post a message to the report.
   */
  it("should allow technical staff to send a message on the report", async () => {
    const messagePayload = { content: "We are fixing the pothole today." };

    const res = await request(app)
      .post(`/messages/reports/${reportId}`)
      .set("Cookie", staffCookie)
      .send(messagePayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.content).toBe(messagePayload.content);
    expect(res.body.userId).toBe(staffUserId);

    // Verify DB Persistence
    const savedMessage = await db.Message.findOne({
      where: { reportId: reportId, content: messagePayload.content },
    });
    expect(savedMessage).toBeDefined();
  });

  // ------------------------------------------------------------------------
  // Sad Paths: Security & Validation
  // ------------------------------------------------------------------------

  /**
   * @test {PUT} /offices/reports/:id/status
   * @description Verifies that a Technical Staff member cannot update a report
   * if they are not the assignee.
   */
  it("should forbid update if the staff member is not the assignee", async () => {
    // Create unauthorized staff user
    const otherStaff = await db.User.create({
      username: "other_staff",
      email: "other@staff.com",
      firstName: "Other",
      lastName: "Staff",
      hashedPassword: await bcrypt.hash("password", 10),
      roleId: (
        await db.Role.findOne({ where: { name: "technical_staff" } })
      ).id,
      emailConfiguration: true,
    });

    // Ensure role association
    const techRole = await db.Role.findOne({
      where: { name: "technical_staff" },
    });
    if (otherStaff.addRole) await otherStaff.addRole(techRole);

    const otherCookie = await loginAndGetCookie({
      username: "other_staff",
      password: "password",
    });

    const res = await request(app)
      .put(`/offices/reports/${reportId}/status`)
      .set("Cookie", otherCookie)
      .send({ status: "Suspended" });

    expect(res.statusCode).toBe(403);
  });

  /**
   * @test {PUT} /offices/reports/:id/status
   * @description Verifies that Citizens are forbidden from accessing the status update endpoint.
   */
  it("should return 403/401 for citizens trying to update status", async () => {
    const res = await request(app)
      .put(`/offices/reports/${reportId}/status`)
      .set("Cookie", citizenCookie)
      .send({ status: "Resolved" });

    expect(res.statusCode).toBeOneOf([403, 401]);
  });

  /**
   * @test {PUT} /offices/reports/:id/status
   * @description Verifies that invalid status strings are rejected with 400 Bad Request.
   */
  it("should return 400 for invalid status values", async () => {
    const res = await request(app)
      .put(`/offices/reports/${reportId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "Invalid Status" });

    expect(res.statusCode).toBe(400);
  });

  /**
   * @test {PUT} /offices/reports/:id/status
   * @description Verifies that requests for non-existent report IDs return 404.
   */
  it("should return 404 if report does not exist", async () => {
    const res = await request(app)
      .put(`/offices/reports/99999/status`)
      .set("Cookie", staffCookie)
      .send({ status: "In Progress" });

    expect(res.statusCode).toBe(404);
  });
});

/**
 * Custom Jest matcher for validating status codes against an allowed set.
 */
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      message: () => `expected ${received} to be in [${expected}]`,
      pass: pass,
    };
  },
});
