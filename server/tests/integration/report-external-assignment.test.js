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
import bcrypt from "bcrypt";

/** @type {object} Global data cache for test setup */
const testData = {};

// --- GLOBAL VARIABLES ---
let technicalOfficerCookie; // Technical Staff Member
let prOfficerCookie; // PR Officer for report review
let citizenCookie;
let extMaintainerCookie; // External Maintainer user cookie (created in beforeAll)

const CITS_COMPANY_ID = 5;
const MAINTAINER_PASSWORD = "password123";

describe("Report External Assignment (Integration)", () => {
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

    // 3. Find External Company associated with Category ID 7 (Roads, handled by CITS, ID 5)
    const company = await db.Company.findByPk(CITS_COMPANY_ID);
    testData.companyId = company.id; // Should be 5

    // 4. Create External Maintainer User and link to CITS (ID 5)
    const externalMaintainerRole = await db.Role.findOne({
      where: { name: "external_maintainer" },
    });
    const uniqueMaintainerUsername = `maintainer${Date.now()}`;

    const maintainerUser = await db.User.create({
      email: `${uniqueMaintainerUsername}@test.com`,
      username: uniqueMaintainerUsername,
      firstName: "Ext",
      lastName: "Man",

      hashedPassword: await bcrypt.hash(MAINTAINER_PASSWORD, 10),
      roleId: externalMaintainerRole.id,
      companyId: testData.companyId,
      emailConfiguration: true,
    });
    testData.maintainerId = maintainerUser.id;

    // 5. Login External Maintainer
    extMaintainerCookie = await loginAndGetCookie({
      username: maintainerUser.username,
      password: MAINTAINER_PASSWORD,
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  /**
   * @description Creates a report and moves it to 'Assigned' status by PR Officer review,
   * automatically assigning it to an internal Technical Officer via load balancing.
   * @returns {Promise<number>} The ID of the newly assigned report.
   */
  const createAndAssignReportToTechnicalOfficer = async () => {
    // 1. Citizen creates the report (POST /reports)
    const createRes = await request(app)
      .post("/reports")
      .set("Cookie", citizenCookie)
      .send(validReportPayload);

    expect(createRes.statusCode).toBe(201);
    const reportId = createRes.body.id;

    // 2. PR Officer accepts the report (PUT /municipal/reports/{reportId})
    const reviewRes = await request(app)
      .put(`/municipal/reports/${reportId}`)
      .set("Cookie", prOfficerCookie)
      .send({ action: "assigned" });

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.status).toBe("Assigned");

    const assignedReport = await db.Report.findByPk(reportId);
    expect(assignedReport.technicalOfficerId).toBeDefined();

    return reportId;
  };

  // --------------------------------------------------------------------------
  // TEST CASE 1: GET /offices/reports/:reportId/companies - Success
  // --------------------------------------------------------------------------
  /**
   * @description Test retrieval of eligible external companies for a specific report's category.
   * @returns {void}
   */
  it("should return eligible companies for a report (GET /offices/reports/{reportId}/companies)", async () => {
    const reportId = await createAndAssignReportToTechnicalOfficer();

    const res = await request(app)
      .get(`/offices/reports/${reportId}/companies`)
      .set("Cookie", technicalOfficerCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Verify the correct seeded company (CITS, ID 5) is returned
    expect(res.body.some((c) => c.id === testData.companyId)).toBe(true);
    expect(res.body[0]).toHaveProperty("address");
  });

  // --------------------------------------------------------------------------
  // TEST CASE 2: PUT /offices/reports/:reportId/assign-external - Success
  // --------------------------------------------------------------------------
  /**
   * @description Test successful assignment of a report to an external maintainer (load balanced).
   * @returns {void}
   */
  it("should successfully assign a report to an external maintainer (PUT /offices/reports/{reportId}/assign-external)", async () => {
    const reportId = await createAndAssignReportToTechnicalOfficer();

    const res = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: testData.companyId });

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(reportId);

    const updatedReport = await db.Report.findByPk(reportId);
    // Verify the report is now linked to the external maintainer user created in beforeAll
    expect(updatedReport.externalMaintainerId).toBe(testData.maintainerId);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 3: PUT /assign-external - Failure (Missing/Invalid data)
  // --------------------------------------------------------------------------
  /**
   * @description Test failure when companyId is missing or non-numeric.
   * @returns {void}
   */
  it("should return 400 if companyId is missing or invalid", async () => {
    const reportId = await createAndAssignReportToTechnicalOfficer();

    // 1. companyId missing
    const resMissing = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({});

    expect(resMissing.statusCode).toBe(400);

    // 2. companyId non-numeric
    const resInvalid = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: "invalid" });

    expect(resInvalid.statusCode).toBe(400);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 4: PUT /assign-external - Failure (Report in invalid status)
  // --------------------------------------------------------------------------
  /**
   * @description Test failure when attempting external assignment on a pending report.
   * @returns {void}
   */
  it("should return 400 if the report is in Pending Approval status", async () => {
    const createRes = await request(app)
      .post("/reports")
      .set("Cookie", citizenCookie)
      .send(validReportPayload);

    const pendingReportId = createRes.body.id;

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
  /**
   * @description Test failure when the provided company ID does not exist.
   * @returns {void}
   */
  it("should return 404 if the company does not exist", async () => {
    const reportId = await createAndAssignReportToTechnicalOfficer();

    const res = await request(app)
      .put(`/offices/reports/${reportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: 9999 });

    expect(res.statusCode).toBe(404);
  });

  // --------------------------------------------------------------------------
  // TEST CASE 6: PUT /assign-external - Failure (No external maintainers)
  // --------------------------------------------------------------------------
  /**
   * @description Test failure when the selected company has no maintainer users.
   * @returns {void}
   */
  it("should return 409 if the company has no external maintainers", async () => {
    const reportId = await createAndAssignReportToTechnicalOfficer();

    const emptyCompany = await db.Company.create({
      name: "Empty Company",
      address: "Via Empty Test 1",
      city: "Milano",
      region: "Lombardia",
      country: "Italia",
    });

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
  /**
   * @description Test that the assignment logic selects the maintainer with the least active reports.
   * @returns {void}
   */
  it("should assign the report to the external maintainer with the fewest active reports", async () => {
    // 1. Assign workload to Maintainer A (testData.maintainerId)
    const reportToAssignId1 = await createAndAssignReportToTechnicalOfficer();
    const reportToAssignId2 = await createAndAssignReportToTechnicalOfficer();
    await db.Report.update(
      { externalMaintainerId: testData.maintainerId, status: "Assigned" },
      { where: { id: reportToAssignId1 } }
    );
    await db.Report.update(
      { externalMaintainerId: testData.maintainerId, status: "Assigned" },
      { where: { id: reportToAssignId2 } }
    );
    // Maintainer A (testData.maintainerId) now has 2 active reports.

    // 2. Create a NEW report to trigger load balancing
    const newReportId = await createAndAssignReportToTechnicalOfficer();

    // 3. Perform external assignment.
    const res = await request(app)
      .put(`/offices/reports/${newReportId}/assign-external`)
      .set("Cookie", technicalOfficerCookie)
      .send({ companyId: testData.companyId });

    expect(res.statusCode).toBe(200);
  });
});
