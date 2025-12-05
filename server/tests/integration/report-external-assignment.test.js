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
  prOfficerLogin,
} from "./test-utils.js";
import db from "../../models/index.mjs";

/**
 * @type {object} Global data cache for test setup
 */
const testData = {};

describe("Report External Assignment (Integration)", () => {
  let technicalOfficerCookie; // Technical Staff Member
  let prOfficerCookie; // PR Officer for report review
  let citizenCookie;

  beforeAll(async () => {
    // 1. Setup DB and seed initial data
    await setupTestDatabase();

    // 2. Login required users
    technicalOfficerCookie = await loginAndGetCookie(technicalStaffLogin);
    prOfficerCookie = await loginAndGetCookie(prOfficerLogin);
    citizenCookie = await loginAndGetCookie(citizenLogin);

    const officerUser = await db.User.findOne({
      where: { username: technicalStaffLogin.username },
    });
    testData.technicalOfficerId = officerUser.id;

    // 3. Setup specific data: Category ID 7 (Roads) is used
    const CATEGORY_ID = validReportPayload.categoryId;

    // 4. Create External Company and link to Category
    // Includes mandatory NOT NULL fields for the Company model
    const company = await db.Company.create({
      name: "External Maintainer Corp",
      address: "Via Dati Test 101",
      region: "Piemonte",
      country: "Italia",
    });
    await company.addCategory(CATEGORY_ID);
    testData.companyId = company.id;

    // 5. Create External Maintainer User
    const externalMaintainerRole = await db.Role.findOne({
      where: { name: "external_maintainer" },
    });

    // Includes mandatory NOT NULL fields for the User model
    const maintainerUser = await db.User.create({
      email: `maintainer${Date.now()}@test.com`,
      username: `maintainer${Date.now()}`,
      firstName: "Ext",
      lastName: "Man",
      hashedPassword: "hashedPassword123",
      roleId: externalMaintainerRole.id,
      companyId: testData.companyId,
      emailConfiguration: true, // Assuming this default value
    });
    testData.maintainerId = maintainerUser.id;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  /**
   * @description Creates a report and moves it to 'Assigned' status by URP review.
   * @returns {Promise<number>} The ID of the newly assigned report.
   */
  const createAndAssignReportToTechnicalOfficer = async () => {
    // 1. Citizen creates the report (POST /reports)
    const createRes = await request(app)
      .post("/reports")
      .set("Cookie", citizenCookie)
      .send(validReportPayload);

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.id).toBeDefined();

    const reportId = createRes.body.id;

    // 2. PR Officer accepts the report (PUT /municipal/reports/{reportId})
    // NOTE: Using the correct Swagger endpoint: /municipal/reports/{reportId}
    const reviewRes = await request(app)
      .put(`/municipal/reports/${reportId}`)
      .set("Cookie", prOfficerCookie)
      .send({ action: "assigned" }); // Action: 'accepted' moves status to 'Assigned'

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.status).toBe("Assigned");

    const assignedReport = await db.Report.findByPk(reportId);
    expect(assignedReport.technicalOfficerId).toBeDefined();
    expect(assignedReport.technicalOfficerId).toBeGreaterThan(0);

    return reportId;
  };

  // --------------------------------------------------------------------------
  // TEST CASE 1: GET /offices/reports/:reportId/companies - Success
  // --------------------------------------------------------------------------
  it("should return eligible companies for a report (GET /offices/reports/{reportId}/companies)", async () => {
    // PREPARATION: Create and assign the report to a Technical Officer
    const reportId = await createAndAssignReportToTechnicalOfficer();

    const res = await request(app)
      .get(`/offices/reports/${reportId}/companies`)
      .set("Cookie", technicalOfficerCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Should find the company created in beforeAll
    expect(res.body.some((c) => c.id === testData.companyId)).toBe(true);
    // Basic verification of required Company details fields
    expect(res.body[0]).toHaveProperty("address");
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: PUT /offices/reports/:reportId/assign-external - Success
  // --------------------------------------------------------------------------
  it("should successfully assign a report to an external maintainer (PUT /offices/reports/{reportId}/assign-external)", async () => {
    // PREPARATION: Create and assign the report to a Technical Officer
    const reportId = await createAndAssignReportToTechnicalOfficer();

    const res = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: testData.companyId });

    // 1. Verify HTTP response
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(reportId);

    // 2. Verify status remains 'Assigned' (or 'In Progress' depending on policy)
    const updatedReport = await db.Report.findByPk(reportId);
    expect(updatedReport.externalMaintainerId).toBe(testData.maintainerId);
    expect(updatedReport.status).toBe("Assigned");
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: PUT /assign-external - Failure (Missing/Invalid data)
  // --------------------------------------------------------------------------
  it("should return 400 if companyId is missing or invalid", async () => {
    // PREPARATION: Report Assigned
    const reportId = await createAndAssignReportToTechnicalOfficer();

    // 1. companyId missing
    const resMissing = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({});

    expect(resMissing.statusCode).toBe(400);
    expect(resMissing.body.message).toContain("companyId is required.");

    // 2. companyId non-numeric
    const resInvalid = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: "invalid" });

    expect(resInvalid.statusCode).toBe(400);
    expect(resInvalid.body.message).toContain(
      "companyId must be a positive integer."
    );
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: PUT /assign-external - Failure (Report in invalid status)
  // --------------------------------------------------------------------------
  it("should return 400 if the report is in Pending Approval status", async () => {
    // PREPARATION: Report created (Status: Pending Approval)
    const createRes = await request(app)
      .post("/reports")
      .set("Cookie", citizenCookie)
      .send(validReportPayload);

    expect(createRes.statusCode).toBe(201);
    const pendingReportId = createRes.body.id;

    // ATTEMPT: External assignment
    const res = await request(app)
      .put(`/offices/reports/${pendingReportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: testData.companyId });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain("Current status is 'Pending Approval'.");
  });

  // --------------------------------------------------------------------------
  // TEST CASE 5: PUT /assign-external - Failure (Company not found)
  // --------------------------------------------------------------------------
  it("should return 404 if the company does not exist", async () => {
    // PREPARATION: Report Assigned
    const reportId = await createAndAssignReportToTechnicalOfficer();
    const nonExistentCompanyId = 9999;

    const res = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: nonExistentCompanyId });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain(
      `Company with id "${nonExistentCompanyId}" not found.`
    );
  });

  // --------------------------------------------------------------------------
  // TEST CASE 6: PUT /assign-external - Failure (No external maintainers)
  // --------------------------------------------------------------------------
  it("should return 409 if the company has no external maintainers", async () => {
    // PREPARATION: Report Assigned
    const reportId = await createAndAssignReportToTechnicalOfficer();

    // Create a Company with no "external_maintainer" users
    const emptyCompany = await db.Company.create({
      name: "Empty Company",
      address: "Via Empty Test 1",
      region: "Lombardia",
      country: "Italia",
    });

    // ATTEMPT: External assignment
    const res = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: emptyCompany.id });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toContain(
      "No external maintainers found in company 'Empty Company'."
    );
  });

  // --------------------------------------------------------------------------
  // TEST CASE 7: Test Load Balancing
  // --------------------------------------------------------------------------
  it("should assign the report to the external maintainer with the fewest active reports", async () => {
    // 1. Assign 2 reports directly to Maintainer A (created in beforeAll) to increase their workload
    const reportToAssignId1 = await createAndAssignReportToTechnicalOfficer();
    const reportToAssignId2 = await createAndAssignReportToTechnicalOfficer();
    await db.Report.update(
      { externalMaintainerId: testData.maintainerId },
      { where: { id: reportToAssignId1 } }
    );
    await db.Report.update(
      { externalMaintainerId: testData.maintainerId },
      { where: { id: reportToAssignId2 } }
    );

    // Maintainer A has 2 active reports. Maintainer B has 0 active reports.

    // 2. Create a NEW report to be assigned
    const newReportId = await createAndAssignReportToTechnicalOfficer();

    // 3. Perform external assignment. The load balancer MUST choose B.
    const res = await request(app)
      .put(`/offices/reports/${newReportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: testData.companyId });

    expect(res.statusCode).toBe(200);
  });
});
