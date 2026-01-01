/**
 * @file Consolidated Integration Test Suite for Technical Office features.
 * @description Includes tests for the HTTP API endpoint (/api/offices) focusing on
 * authorization and response format, and direct integration tests for the
 * Technical Office Repository functions (CRUD and associations) to ensure
 * database persistence integrity.
 */

import request from "supertest";
import { app } from "../../index.mjs";
import db from "../../models/index.mjs";
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  adminLogin,
  prOfficerLogin,
  technicalStaffLogin,
} from "./test-utils.js";

import {
  createTechnicalOffice,
  findTechnicalOfficeById,
  findTechnicalOfficeByName,
  updateTechnicalOffice,
  deleteTechnicalOffice,
} from "../../repositories/technical-office-repo.mjs";
import * as TechnicalOfficeRepo from "../../repositories/technical-office-repo.mjs";

// --- TEST DATA ---

// Users for authorization tests
const ADMIN = adminLogin;
const PR_OFFICER = prOfficerLogin;
const TECH_STAFF = technicalStaffLogin;

// Constants from seed data for repository verification
const EXISTING_OFFICE_ID = 1; // Water Infrastructure Office
const EXISTING_OFFICE_NAME = "Water Infrastructure Office";
const EXISTING_STAFF_ID = 10; // Tech Staff 1 (Luca Rossi)
const EXISTING_CATEGORY_ID = 1; // Water Supply - Drinking Water

describe("Consolidated Technical Office Integration Tests", () => {
  let adminCookie;
  let prOfficerCookie;
  let techStaffCookie;

  beforeAll(async () => {
    // 1. Setup DB and seed data
    await setupTestDatabase();

    // 2. Log in all required users
    adminCookie = await loginAndGetCookie(ADMIN);
    prOfficerCookie = await loginAndGetCookie(PR_OFFICER);
    techStaffCookie = await loginAndGetCookie(TECH_STAFF);
  });

  afterAll(async () => {
    // 3. Teardown DB
    await teardownTestDatabase();
  });

  // =========================================================================
  // === SECTION 1: API INTEGRATION TESTS (HTTP Endpoint: /api/offices) ======
  // =========================================================================

  describe("API Endpoint Test: GET /api/offices", () => {
    test("should allow Admin to retrieve all simplified technical offices (Status 200)", async () => {
      const res = await request(app).get("/offices").set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const officeCount = await db.TechnicalOffice.count();
      expect(res.body.length).toBe(officeCount);

      // Check the structure (simplified DTO: only id and name)
      if (res.body.length > 0) {
        const firstOffice = res.body[0];
        expect(firstOffice).toHaveProperty("id");
        expect(firstOffice).toHaveProperty("name");
        expect(Object.keys(firstOffice).length).toBe(2);
      }
    });

    test("should deny access to non-authenticated users (Status 401)", async () => {
      const res = await request(app).get("/offices");
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe("User not authenticated");
    });

    test("should deny access to Public Relations Officer (Status 403 - Forbidden)", async () => {
      const res = await request(app)
        .get("/offices")
        .set("Cookie", prOfficerCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden: admin only");
    });

    test("should deny access to Technical Staff (Status 403 - Forbidden)", async () => {
      const res = await request(app)
        .get("/offices")
        .set("Cookie", techStaffCookie);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Forbidden: admin only");
    });
  });

  // =========================================================================
  // === SECTION 2: REPOSITORY INTEGRATION TESTS (DB Persistence & Relations)
  // =========================================================================

  describe("Repository Persistence & Association Tests (TechnicalOfficeRepo)", () => {
    // --- CREATE ---

    describe("createTechnicalOffice", () => {
      test("should successfully create a new technical office", async () => {
        const newOfficeData = {
          name: "Test Planning Office",
          categoryId: null,
        };

        const createdOffice = await createTechnicalOffice(newOfficeData);

        expect(createdOffice).toBeDefined();
        expect(createdOffice.name).toBe(newOfficeData.name);
      });
    });

    // --- READ (Find All & Associations) ---

    describe("findAllTechnicalOffices", () => {
      test("should return all offices and correctly load Category and User associations", async () => {
        const realStaff = await db.User.findOne({
          where: { username: "tech_roads" },
        });
        const STAFF_ID = realStaff.id;

        const offices = await TechnicalOfficeRepo.findAllTechnicalOffices();

        expect(offices.length).toBeGreaterThan(0);

        // Cerca l'ufficio che contiene quel tecnico
        const office = offices.find(
          (o) => o.users && o.users.some((u) => u.id === STAFF_ID)
        );

        expect(office).toBeDefined();
        expect(office.category).toBeDefined();

        const officer = office.users.find((u) => u.id === STAFF_ID);
        expect(officer).toBeDefined();
        expect(officer.username).toBe("tech_roads");
      });
    });

    // --- READ (Find By ID) ---

    describe("findTechnicalOfficeById", () => {
      test("should find an office by ID and load all associations", async () => {
        const office = await findTechnicalOfficeById(EXISTING_OFFICE_ID);

        expect(office).toBeDefined();
        expect(office.id).toBe(EXISTING_OFFICE_ID);
        expect(office.name).toBe(EXISTING_OFFICE_NAME);

        // Verify associations are loaded
        expect(office.category).not.toBeNull();
        expect(Array.isArray(office.users)).toBe(true);
      });

      test("should return null for non-existent ID", async () => {
        const office = await findTechnicalOfficeById(9999);
        expect(office).toBeNull();
      });
    });

    // --- READ (Find By Name) ---

    describe("findTechnicalOfficeByName", () => {
      test("should find an office by name and load all associations", async () => {
        const office = await findTechnicalOfficeByName(EXISTING_OFFICE_NAME);

        expect(office).toBeDefined();
        expect(office.id).toBe(EXISTING_OFFICE_ID);
        expect(office.name).toBe(EXISTING_OFFICE_NAME);

        // Verify associations are loaded
        expect(office.category).not.toBeNull();
        expect(Array.isArray(office.users)).toBe(true);
      });

      test("should return null for non-existent name", async () => {
        const office = await findTechnicalOfficeByName("Non-existent Office");
        expect(office).toBeNull();
      });
    });

    // --- UPDATE ---

    describe("updateTechnicalOffice", () => {
      const officeToUpdateId = 2; // Architectural Barriers Office
      const newName = "Updated Mobility Office Name";

      test("should update the office name and return true", async () => {
        const updated = await updateTechnicalOffice(officeToUpdateId, {
          name: newName,
        });

        expect(updated).toBe(true);

        // Verify the change in DB
        const updatedOffice = await findTechnicalOfficeById(officeToUpdateId);
        expect(updatedOffice.name).toBe(newName);
      });

      test("should return false if the ID does not exist", async () => {
        const updated = await updateTechnicalOffice(9998, { name: "Fake" });
        expect(updated).toBe(false);
      });
    });

    // --- DELETE ---

    describe("deleteTechnicalOffice", () => {
      let officeToDeleteId;

      beforeAll(async () => {
        const office = await createTechnicalOffice({
          name: "Temporary Office to Delete",
        });
        officeToDeleteId = office.id;
      });

      test("should delete a technical office by its ID and return true", async () => {
        const deleted = await deleteTechnicalOffice(officeToDeleteId);

        expect(deleted).toBe(true);

        // Verify deletion
        const foundOffice = await findTechnicalOfficeById(officeToDeleteId);
        expect(foundOffice).toBeNull();
      });

      test("should return false if the ID does not exist", async () => {
        const deleted = await deleteTechnicalOffice(9997);
        expect(deleted).toBe(false);
      });
    });
  });
});
