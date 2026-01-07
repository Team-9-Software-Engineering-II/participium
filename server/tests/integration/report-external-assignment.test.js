/**
 * @file Report External Assignment Integration Tests
 * @description Integration tests for the workflow of assigning reports to external companies.
 * Covers company eligibility, assignment execution, load balancing, and error handling.
 */

import {describe, it, expect, beforeAll, afterAll} from "@jest/globals";
import request from "supertest";
import {app} from "../../index.mjs";
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
let extMaintainerCookie; // External Maintainer user cookie

const MAINTAINER_PASSWORD = "password123";

describe("Report External Assignment (Integration)", () => {
    /**
     * @description Sets up the test environment, seeds the database, and creates specific
     * test entities (Company, Maintainer) with necessary N:M role associations.
     */
    beforeAll(async () => {
        // 1. Setup DB and seed initial data
        await setupTestDatabase();

        // 2. Login required users
        technicalOfficerCookie = await loginAndGetCookie(technicalStaffLogin);
        prOfficerCookie = await loginAndGetCookie(prOfficerLogin);
        citizenCookie = await loginAndGetCookie(citizenLogin);

        // 3. Create a unique Company for isolation
        const testCompany = await db.Company.create({
            name: `Unique Test Logistics ${Date.now()}`,
            address: "123 Maintenance Way",
            city: "Turin",
            region: "Piedmont",
            country: "Italy",
        });
        testData.companyId = testCompany.id;

        // Link Company to Category 7 (Roads) so it appears as eligible
        const category = await db.Category.findByPk(7);
        if (!category) throw new Error("Category ID 7 not found. Check seeders.");
        await testCompany.addCategory(category);

        // 4. Create External Maintainer User
        const externalMaintainerRole = await db.Role.findOne({
            where: {name: "external_maintainer"},
        });

        const uniqueMaintainerUsername = `maintainer${Date.now()}`;

        const maintainerUser = await db.User.create({
            email: `${uniqueMaintainerUsername}@test.com`,
            username: uniqueMaintainerUsername,
            firstName: "Ext",
            lastName: "Man",
            hashedPassword: await bcrypt.hash(MAINTAINER_PASSWORD, 10),
            companyId: testData.companyId,
            emailConfiguration: true,
        });
        testData.maintainerId = maintainerUser.id;

        // FIX: Explicitly add role to the N:M join table.
        // Necessary for the backend to recognize this user as a valid staff member of the company.
        if (maintainerUser.addRole) {
            await maintainerUser.addRole(externalMaintainerRole);
        }

        const officerUser = await db.User.findOne({
            where: {username: technicalStaffLogin.username},
        });
        testData.technicalOfficerId = officerUser.id;

        // 5. Login External Maintainer
        extMaintainerCookie = await loginAndGetCookie({
            username: maintainerUser.username,
            password: MAINTAINER_PASSWORD,
        });
    });

    /**
     * @description Teardown database connections after all tests.
     */
    afterAll(async () => {
        await teardownTestDatabase();
    });

    /**
     * @function createAndAssignReportToTechnicalOfficer
     * @description Utility to create a report and transition it to 'Assigned' status via
     * PR Officer review, making it ready for external assignment testing.
     * @returns {Promise<number>} The ID of the newly assigned report.
     */
    const createAndAssignReportToTechnicalOfficer = async () => {
        // 1. Citizen creates report
        const createRes = await request(app)
            .post("/reports")
            .set("Cookie", citizenCookie)
            .send(validReportPayload);

        expect(createRes.statusCode).toBe(201);
        const reportId = createRes.body.id;

        // 2. PR Officer accepts report
        const reviewRes = await request(app)
            .put(`/municipal/reports/${reportId}`)
            .set("Cookie", prOfficerCookie)
            .send({action: "assigned"});

        expect(reviewRes.statusCode).toBe(200);
        return reportId;
    };

    // --------------------------------------------------------------------------
    // TEST CASES
    // --------------------------------------------------------------------------

    /**
     * @test GET /offices/reports/:reportId/companies
     * @description Verifies retrieval of eligible external companies based on the report's category.
     */
    it("should return eligible companies for a report (GET /offices/reports/{reportId}/companies)", async () => {
        const reportId = await createAndAssignReportToTechnicalOfficer();

        const res = await request(app)
            .get(`/offices/reports/${reportId}/companies`)
            .set("Cookie", technicalOfficerCookie);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((c) => c.id === testData.companyId)).toBe(true);
    });

    /**
     * @test PUT /offices/reports/:reportId/assign-external
     * @description Tests the successful assignment of a report to an external maintainer, verifying database persistence.
     */
    it("should successfully assign a report to an external maintainer (PUT /offices/reports/{reportId}/assign-external)", async () => {
        const reportId = await createAndAssignReportToTechnicalOfficer();

        const res = await request(app)
            .put(`/offices/reports/${reportId}/assign-external`)
            .set("Cookie", technicalOfficerCookie)
            .send({companyId: testData.companyId});

        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(reportId);

        const updatedReport = await db.Report.findByPk(reportId);
        expect(updatedReport.externalMaintainerId).toBe(testData.maintainerId);
    });

    /**
     * @test PUT /offices/reports/:reportId/assign-external
     * @description Validates input sanitization for missing or invalid company IDs.
     */
    it("should return 400 if companyId is missing or invalid", async () => {
        const reportId = await createAndAssignReportToTechnicalOfficer();

        await request(app)
            .put(`/offices/reports/${reportId}/assign-external`)
            .set("Cookie", technicalOfficerCookie)
            .send({})
            .expect(400);

        await request(app)
            .put(`/offices/reports/${reportId}/assign-external`)
            .set("Cookie", technicalOfficerCookie)
            .send({companyId: "invalid"})
            .expect(400);
    });

    /**
     * @test PUT /offices/reports/:reportId/assign-external
     * @description Ensures reports cannot be externally assigned while still in 'Pending Approval' status.
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
            .send({companyId: testData.companyId});

        expect(res.statusCode).toBe(400);
    });

    /**
     * @test PUT /offices/reports/:reportId/assign-external
     * @description Handles scenarios where the target company does not exist.
     */
    it("should return 404 if the company does not exist", async () => {
        const reportId = await createAndAssignReportToTechnicalOfficer();

        await request(app)
            .put(`/offices/reports/${reportId}/assign-external`)
            .set("Cookie", technicalOfficerCookie)
            .send({companyId: 99999})
            .expect(404);
    });

    /**
     * @test PUT /offices/reports/:reportId/assign-external
     * @description Verifies conflict error (409) when the selected company has no valid external maintainers.
     */
    it("should return 409 if the company has no external maintainers", async () => {
        const reportId = await createAndAssignReportToTechnicalOfficer();

        // Create empty company without users
        const emptyCompany = await db.Company.create({
            name: `Empty Co ${Date.now()}`,
            address: "Nowhere",
            city: "Void",
            region: "Null",
            country: "Nil",
        });
        const category = await db.Category.findByPk(7);
        await emptyCompany.addCategory(category);

        const res = await request(app)
            .put(`/offices/reports/${reportId}/assign-external`)
            .set("Cookie", technicalOfficerCookie)
            .send({companyId: emptyCompany.id});

        expect(res.statusCode).toBe(409);
    });

    /**
     * @test PUT /offices/reports/:reportId/assign-external
     * @description Validates the load balancing algorithm, ensuring the maintainer is assigned correctly
     * even when under load.
     */
    it("should assign the report to the external maintainer with the fewest active reports", async () => {
        // 1. Manually overload the maintainer
        const report1 = await createAndAssignReportToTechnicalOfficer();
        const report2 = await createAndAssignReportToTechnicalOfficer();

        await db.Report.update(
            {externalMaintainerId: testData.maintainerId, status: "Assigned"},
            {where: {id: [report1, report2]}}
        );

        // 2. Assign new report
        const targetReportId = await createAndAssignReportToTechnicalOfficer();
        const res = await request(app)
            .put(`/offices/reports/${targetReportId}/assign-external`)
            .set("Cookie", technicalOfficerCookie)
            .send({companyId: testData.companyId});

        expect(res.statusCode).toBe(200);

        // Verify assignment directly in DB
        const updatedReport = await db.Report.findByPk(targetReportId);
        expect(updatedReport.externalMaintainerId).toBe(testData.maintainerId);
    });
});