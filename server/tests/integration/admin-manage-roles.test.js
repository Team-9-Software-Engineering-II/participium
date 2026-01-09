/**
 * @file Integration Test: Admin Role Management
 * @description Validates the functionality for system administrators to modify user roles.
 * Covers the N:M relationship support, enabling assignment of multiple roles and cancellation.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { app } from "../../index.mjs";
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  citizenLogin,
} from "./test-utils.js";
import db from "../../models/index.mjs";
import bcrypt from "bcrypt";

// --- Global Test Data ---

/** @type {string} Admin session cookie */
let adminCookie;
/** @type {string} Citizen session cookie (for unauthorized access tests) */
let citizenCookie;
/** @type {number} ID of the user target for modification */
let targetUserId;

/** @type {object} Cache for Role entities */
const roles = {};

const adminCredentials = {
  username: "admin_user",
  password: "password123",
};

describe("Admin: Role Management (N:M Support)", () => {
  /**
   * @description Sets up the test database, seeds necessary roles,
   * creates an admin user, and initializes a target user for testing.
   */
  beforeAll(async () => {
    await setupTestDatabase();

    // 1. Initialize Admin User
    const adminRole = await db.Role.findOne({ where: { name: "admin" } });
    if (!adminRole) throw new Error("Admin role not found during setup.");

    const adminUser = await db.User.create({
      email: "admin@test.com",
      username: adminCredentials.username,
      firstName: "Admin",
      lastName: "User",
      hashedPassword: await bcrypt.hash(adminCredentials.password, 10),
      emailConfiguration: true,
    });

    // Assign Admin role
    if (adminUser.addRole) {
      await adminUser.addRole(adminRole);
    } else {
      // Legacy fallback
      try {
        await db.sequelize.query(
          `UPDATE users SET roleId = ${adminRole.id} WHERE id = ${adminUser.id}`
        );
      } catch (e) {}
    }

    // 2. Generate Sessions
    adminCookie = await loginAndGetCookie(adminCredentials);
    citizenCookie = await loginAndGetCookie(citizenLogin);

    // 3. Cache Roles for Test Usage
    roles.tech = await db.Role.findOne({ where: { name: "technical_staff" } });
    roles.pr = await db.Role.findOne({
      where: { name: "municipal_public_relations_officer" },
    });

    if (!roles.tech || !roles.pr)
      throw new Error("Required roles not found in DB.");

    // 4. Create Target User
    const targetUser = await db.User.create({
      email: "staff_target@test.com",
      username: "staff_target",
      firstName: "Luigi",
      lastName: "Mario",
      hashedPassword: await bcrypt.hash("pwd", 10),
      emailConfiguration: true,
    });
    targetUserId = targetUser.id;
  });

  /**
   * @description Cleans up the database connection after testing.
   */
  afterAll(async () => {
    await teardownTestDatabase();
  });

  // ------------------------------------------------------------------------
  // Happy Path Scenarios
  // ------------------------------------------------------------------------

  /**
   * @test {PUT} /admin/users/:userId/roles
   * @description Verifies that an Admin can assign multiple roles to a user simultaneously.
   */
  it("should allow Admin to assign multiple roles to a user", async () => {
    const payload = {
      roleIds: [roles.tech.id, roles.pr.id],
    };

    const res = await request(app)
      .put(`/admin/users/${targetUserId}/roles`)
      .set("Cookie", adminCookie)
      .send(payload);

    expect(res.statusCode).toBe(200);

    // Verify database state
    const userInDb = await db.User.findByPk(targetUserId, {
      include: [{ model: db.Role, as: "roles" }],
    });

    expect(userInDb.roles).toHaveLength(2);
    const roleNames = userInDb.roles.map((r) => r.name);
    expect(roleNames).toContain("technical_staff");
    expect(roleNames).toContain("municipal_public_relations_officer");
  });

  /**
   * @test {PUT} /admin/users/:userId/roles
   * @description Verifies that submitting a reduced list of roles overwrites the existing configuration,
   * effectively removing the omitted roles.
   */
  it("should allow Admin to remove a role by sending a reduced list", async () => {
    // Payload contains only one role, expecting removal of the others
    const payload = {
      roleIds: [roles.tech.id],
    };

    const res = await request(app)
      .put(`/admin/users/${targetUserId}/roles`)
      .set("Cookie", adminCookie)
      .send(payload);

    expect(res.statusCode).toBe(200);

    // Verify persistence
    const userInDb = await db.User.findByPk(targetUserId, {
      include: [{ model: db.Role, as: "roles" }],
    });

    expect(userInDb.roles).toHaveLength(1);
    expect(userInDb.roles[0].name).toBe("technical_staff");
  });

  // ------------------------------------------------------------------------
  // Error Handling / Sad Paths
  // ------------------------------------------------------------------------

  /**
   * @test {PUT} /admin/users/:userId/roles
   * @description Verifies validation logic for invalid payloads.
   */
  it("should return 400 for invalid payload (missing roleIds)", async () => {
    const res = await request(app)
      .put(`/admin/users/${targetUserId}/roles`)
      .set("Cookie", adminCookie)
      .send({}); // Invalid body

    expect(res.statusCode).toBe(400);
  });

  /**
   * @test {PUT} /admin/users/:userId/roles
   * @description Verifies security restrictions preventing non-admins from modifying roles.
   */
  it("should return 403 for non-admin users", async () => {
    const payload = { roleIds: [roles.tech.id] };

    const res = await request(app)
      .put(`/admin/users/${targetUserId}/roles`)
      .set("Cookie", citizenCookie)
      .send(payload);

    expect(res.statusCode).toBeOneOf([403, 401]);
  });

  /**
   * @test {PUT} /admin/users/:userId/roles
   * @description Verifies error handling when the target user does not exist.
   */
  it("should return 404 if user does not exist", async () => {
    const res = await request(app)
      .put(`/admin/users/999999/roles`)
      .set("Cookie", adminCookie)
      .send({ roleIds: [roles.tech.id] });

    expect(res.statusCode).toBe(404);
  });
});

// --- Test Helpers ---

/**
 * Custom matcher to verify if the status code is included in a list of expected codes.
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
