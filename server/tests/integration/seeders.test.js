/**
 * @file Integration tests for database seeders.
 * @description Verifies data integrity, relationships, idempotency, and granular error handling for all seeding modules.
 */

process.env.NODE_ENV = "test";

import { beforeAll, afterAll, describe, it, expect, jest } from "@jest/globals";
import bcrypt from "bcrypt";
import db from "../../models/index.mjs";
import logger from "../../shared/logging/logger.mjs";
import { setupTestDatabase, teardownTestDatabase } from "./test-utils.js";
import { seedDatabase } from "../../seeders/index.mjs";

// Individual seeder imports for granular error testing
import { seedRoles } from "../../seeders/seed-roles.mjs";
import { seedCategories } from "../../seeders/seed-category.mjs";
import { seedTechnicalOffices } from "../../seeders/seed-technical-office.mjs";
import { seedCompanies } from "../../seeders/seed-company.mjs";
import { seedCompanyCategories } from "../../seeders/seed-company-category.mjs";
import { seedUsers } from "../../seeders/seed-users.mjs";
import { seedReports } from "../../seeders/seed-reports.mjs";

describe("Database Seeders Integrity", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("Core Data Presence", () => {
    /** @test Verifies all system roles are correctly populated. */
    it("should have all 5 mandatory system roles seeded", async () => {
      const roles = await db.Role.findAll();
      const roleNames = roles.map((r) => r.name);
      expect(roles.length).toBe(5);
      expect(roleNames).toContain("citizen");
      expect(roleNames).toContain("admin");
      expect(roleNames).toContain("technical_staff");
    });

    /** @test Verifies categories are present and correctly described. */
    it("should have seeded the 9 standard problem categories", async () => {
      const count = await db.Category.count();
      expect(count).toBe(9);
      const wasteCategory = await db.Category.findOne({
        where: { name: "Waste" },
      });
      expect(wasteCategory).not.toBeNull();
    });
  });

  describe("User Data and Security", () => {
    /** @test Verifies that seeded passwords are properly hashed. */
    it("should store hashed passwords that are verifiable via bcrypt", async () => {
      const admin = await db.User.findOne({ where: { username: "admin" } });
      expect(admin).not.toBeNull();
      const isMatch = await bcrypt.compare("password123", admin.hashedPassword);
      expect(isMatch).toBe(true);
    });

    /** @test Ensures users are correctly linked to their respective roles. */
    it("should correctly link technical staff to the 'technical_staff' role", async () => {
      const techUser = await db.User.findOne({
        where: { username: "tech_water" },
        include: [{ model: db.Role, as: "roles" }],
      });
      const hasTechnicalRole = techUser.roles.some(
        (role) => role.name === "technical_staff"
      );
      expect(hasTechnicalRole).toBe(true);
    });
  });

  describe("Relational Integrity", () => {
    /** @test Verifies the 1:1 relationship between Technical Offices and Categories. */
    it("should link Technical Offices to the correct Problem Categories", async () => {
      const roadsOffice = await db.TechnicalOffice.findOne({
        where: { name: "Roads Maintenance Office" },
        include: [{ model: db.Category, as: "category" }],
      });
      expect(roadsOffice.categoryId).toBe(7);
      expect(roadsOffice.category.name).toBe("Roads and Urban Furnishings");
    });

    /** @test Verifies the N:M relationship between Companies and Categories. */
    it("should have seeded Many-to-Many associations between Companies and Categories", async () => {
      const smat = await db.Company.findByPk(1, {
        include: [{ model: db.Category, as: "categories" }],
      });
      const categoryIds = smat.categories.map((c) => c.id);
      expect(categoryIds).toContain(1);
      expect(categoryIds).toContain(3);
    });

    /** @test Verifies that seeded reports are correctly distributed across statuses. */
    it("should have seeded reports with various initial statuses", async () => {
      const pendingCount = await db.Report.count({
        where: { status: "Pending Approval" },
      });
      const assignedCount = await db.Report.count({
        where: { status: "Assigned" },
      });
      expect(pendingCount).toBeGreaterThan(0);
      expect(assignedCount).toBeGreaterThan(0);
    });
  });

  describe("Seeder Idempotency", () => {
    /** @test Ensures that running the seeder twice does not duplicate records. */
    it("should not duplicate roles or categories if seedDatabase is called again", async () => {
      await seedDatabase();
      const rolesCount = await db.Role.count();
      const categoriesCount = await db.Category.count();
      expect(rolesCount).toBe(5);
      expect(categoriesCount).toBe(9);
    });
  });

  describe("Granular Error Handling", () => {
    let loggerSpy;

    beforeEach(() => {
      // Silence logger to keep test output clean
      loggerSpy = jest.spyOn(logger, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    /** @test Error Handling: Main Orchestrator */
    it("should log a critical error and throw if the main seedDatabase orchestrator fails", async () => {
      const dbSpy = jest
        .spyOn(db.Role, "count")
        .mockRejectedValue(new Error("CRITICAL_FAIL"));
      await expect(seedDatabase()).rejects.toThrow("CRITICAL_FAIL");
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("critical error"),
        expect.any(Error)
      );
    });

    /** @test Error Handling: seedRoles */
    it("should log and throw error when seedRoles fails", async () => {
      jest.spyOn(db.Role, "count").mockRejectedValue(new Error("ROLE_ERROR"));
      await expect(seedRoles()).rejects.toThrow("ROLE_ERROR");
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error seeding roles:",
        expect.any(Error)
      );
    });

    /** @test Error Handling: seedCategories */
    it("should log and throw error when seedCategories fails", async () => {
      jest
        .spyOn(db.Category, "count")
        .mockRejectedValue(new Error("CAT_ERROR"));
      await expect(seedCategories()).rejects.toThrow("CAT_ERROR");
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error seeding categories:",
        expect.any(Error)
      );
    });

    /** @test Error Handling: seedTechnicalOffices */
    it("should log and throw error when seedTechnicalOffices fails", async () => {
      jest
        .spyOn(db.TechnicalOffice, "count")
        .mockRejectedValue(new Error("OFFICE_ERROR"));
      await expect(seedTechnicalOffices()).rejects.toThrow("OFFICE_ERROR");
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error seeding technical offices:",
        expect.any(Error)
      );
    });

    /**
     * @test Verifies that seedCompanies logs the specific prefix and rethrows the original error.
     */
    it("should log specific error and throw when seedCompanies database operation fails", async () => {
      const dbError = new Error("COMP_ERROR");
      jest.spyOn(db.Company, "count").mockRejectedValue(dbError);

      // We expect the original DB error to be re-thrown
      await expect(seedCompanies()).rejects.toThrow("COMP_ERROR");

      // We verify the logger was called with the professional prefix
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error seeding companies:",
        dbError
      );
    });

    /** @test Error Handling: seedCompanyCategories */
    it("should log and throw error when seedCompanyCategories fails", async () => {
      jest
        .spyOn(db.CompanyCategory, "count")
        .mockRejectedValue(new Error("ASSOC_ERROR"));
      await expect(seedCompanyCategories()).rejects.toThrow("ASSOC_ERROR");
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error seeding company-category associations:",
        expect.any(Error)
      );
    });

    /** @test Error Handling: seedUsers */
    it("should log and throw error when seedUsers fails", async () => {
      jest.spyOn(db.User, "count").mockRejectedValue(new Error("USER_ERROR"));
      await expect(seedUsers()).rejects.toThrow("USER_ERROR");
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error seeding users:",
        expect.any(Error)
      );
    });

    /** @test Error Handling: seedReports */
    it("should log and throw error when seedReports fails", async () => {
      jest
        .spyOn(db.Report, "count")
        .mockRejectedValue(new Error("REPORT_ERROR"));
      await expect(seedReports()).rejects.toThrow("REPORT_ERROR");
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error seeding reports:",
        expect.any(Error)
      );
    });
  });
});
