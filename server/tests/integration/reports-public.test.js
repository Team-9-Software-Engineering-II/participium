/**
 * @file Integration tests for public access to reports and categories.
 * @description Verifies that unregistered users can view approved reports and categories on the map.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import { setupTestDatabase, teardownTestDatabase } from "./test-utils.js";

describe("Public Access API (Unregistered User)", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("GET /reports", () => {
    /**
     * @test Verifies that guest users can retrieve reports without authentication.
     */
    it("should return 200 OK for unregistered users", async () => {
      const res = await request(app).get("/reports");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    /**
     * @test Ensures that Pending Approval and Rejected reports are filtered out for guests.
     */
    it("should filter out private report statuses (Pending Approval, Rejected)", async () => {
      const res = await request(app).get("/reports");

      const reports = res.body;
      const privateStatuses = ["Pending Approval", "Rejected"];

      const containsPrivate = reports.some((r) =>
        privateStatuses.includes(r.status)
      );
      expect(containsPrivate).toBe(false);
    });

    /**
     * @test Verifies presence of geospatial data required for map rendering.
     */
    it("should include necessary map data (latitude, longitude, and status)", async () => {
      const res = await request(app).get("/reports");

      if (res.body.length > 0) {
        const report = res.body[0];
        expect(report).toHaveProperty("latitude");
        expect(report).toHaveProperty("longitude");
        expect(report).toHaveProperty("status");
      }
    });
  });

  describe("GET /reports/:reportId", () => {
    /**
     * @test Verifies that a public report can be accessed individually by id.
     */
    it("should allow guest access to an individual public report", async () => {
      // ID 2 is "Assigned" in seedReports
      const res = await request(app).get("/reports/2");
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(2);
    });

    /**
     * @test Ensures that private reports return 404 for guests for security/privacy reasons.
     */
    it("should return 404 when guest tries to access a Pending Approval report", async () => {
      // ID 1 is "Pending Approval" in seedReports
      const res = await request(app).get("/reports/1");
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Report not found.");
    });
  });

  describe("GET /reports/categories", () => {
    /**
     * @test Verifies that categories are accessible to guests for map filtering.
     */
    it("should allow unregistered users to fetch all categories", async () => {
      const res = await request(app).get("/reports/categories");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
