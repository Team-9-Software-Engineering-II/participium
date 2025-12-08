/**
 * @file Integration Test for User Story PT03 - Admin Role Assignment
 * @description This test covers the full flow for an admin assigning
 * roles to municipality users, including security and validation.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";

// Import all necessary utilities from the test-utils.js file
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  uniqueId,
  adminLogin as defaultAdminLogin,
} from "./test-utils.js";

import {
  createRole,
  findAllRoles,
  findRoleById,
  findRoleByName,
  updateRole,
  deleteRole,
} from "../../repositories/role-repo.mjs";

// --- Global variables for storing session cookies and user data ---
/** @type {string} */
let adminCookie;
/** @type {string} */
let attackerCitizenCookie;
/** @type {number} */
let targetCitizenId;

// The local 'uniqueId' variable is replaced by the imported one, but we define
// the test-specific user data here.
/** @type {number} */
const specificUniqueId = uniqueId + 1; // A small offset for differentiation

// --- Test User Definitions ---

/**
 * @type {object} The target user whose role will be changed by the admin.
 */
const targetCitizen = {
  email: `target-${specificUniqueId}@example.com`,
  username: `target${specificUniqueId}`,
  firstName: "Target",
  lastName: "Citizen",
  password: "Password123!",
};

/**
 * @type {object} A second user to test the 403 Forbidden scenario (non-admin trying to assign roles).
 */
const attackerCitizen = {
  email: `attacker-${specificUniqueId + 1}@example.com`,
  username: `attacker${specificUniqueId + 1}`,
  firstName: "Attacker",
  lastName: "Citizen",
  password: "Password123!",
};

/**
 * @type {object} Admin credentials imported from test-utils.js.
 */
const adminLogin = defaultAdminLogin;

// --- Test Hooks (Setup & Teardown) ---

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

/**
 * @description Preamble: Register all necessary users and log in to get session cookies.
 * This block runs before the main tests.
 */
describe("Preamble: User Setup & Login", () => {
  it("should register the target citizen user", async () => {
    const res = await request(app).post("/auth/register").send(targetCitizen);
    expect(res.statusCode).toBe(201);
  });

  it("should register the 'attacker' citizen user", async () => {
    const res = await request(app).post("/auth/register").send(attackerCitizen);
    expect(res.statusCode).toBe(201);
  });

  // Use the loginAndGetCookie function from test-utils.js
  it("should login as Admin and store the admin cookie", async () => {
    // loginAndGetCookie handles the login request and cookie extraction
    adminCookie = await loginAndGetCookie(adminLogin);
    expect(adminCookie).toBeDefined();

    const res = await request(app).get("/users/me").set("Cookie", adminCookie);
    expect(res.statusCode).toBe(200);
  });

  // Use the loginAndGetCookie function from test-utils.js
  it("should login as 'attacker' citizen and store their cookie", async () => {
    attackerCitizenCookie = await loginAndGetCookie({
      username: attackerCitizen.username,
      password: attackerCitizen.password,
    });
    expect(attackerCitizenCookie).toBeDefined();
  });

  it("should login as 'target' citizen to get their ID", async () => {
    // We keep the original logic here to easily retrieve the ID from the body
    const res = await request(app).post("/auth/login").send({
      username: targetCitizen.username,
      password: targetCitizen.password,
    });
    expect(res.statusCode).toBe(200);
    targetCitizenId = res.body.user.id;
    expect(targetCitizenId).toBeDefined();
  });
});

/**
 * @description Test suite for GET /admin/roles endpoint, ensuring the RoleService
 * logic correctly filters out 'admin' and 'citizen' roles.
 */
describe("GET /admin/roles (Assignable Roles)", () => {
  /**
   * @description Test successful retrieval of assignable roles by an authenticated Admin.
   * Verifies that 'citizen' and 'admin' roles are explicitly excluded by the RoleService logic.
   * @returns {number} 200 OK.
   */
  it("should return only municipal/technical roles for the admin (200)", async () => {
    const res = await request(app)
      .get("/admin/roles")
      .set("Cookie", adminCookie);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const roleNames = res.body.map((role) => role.name);
    expect(roleNames).not.toContain("citizen");
    expect(roleNames).not.toContain("admin");

    expect(roleNames).toContain("technical_staff");
    expect(roleNames).toContain("municipal_public_relations_officer");
  });

  /**
   * @description Test role retrieval failure when requested by a non-admin citizen (Authentication OK, Authorization FAIL).
   * @returns {number} 403 Forbidden.
   */
  it("should return 403 if roles are requested by a non-admin citizen", async () => {
    const res = await request(app)
      .get("/admin/roles")
      .set("Cookie", attackerCitizenCookie);

    expect(res.statusCode).toBe(403);
  });

  /**
   * @description Test role retrieval failure when not authenticated.
   * @returns {number} 401 Unauthorized.
   */
  it("should return 401 if roles are requested by an unauthenticated user", async () => {
    const res = await request(app).get("/admin/roles");
    expect(res.statusCode).toBe(401);
  });
});

/**
 * @description Integration Tests for the Role Repository (CRUD operations against the real DB).
 */
describe("Role Repository Integration (role-repo.mjs)", () => {
  let newRoleId;
  const newRoleData = { name: `test_role_${Date.now()}` };
  const updatedRoleName = `updated_role_${Date.now() + 1}`;

  // C.R.U.D. Tests

  /**
   * @description Test CreateRole and FindRoleByName
   * @returns {number} 201 Created.
   */
  it("should successfully CREATE a new role and FIND it by name", async () => {
    const role = await createRole(newRoleData);

    expect(role).toBeDefined();
    expect(role.name).toBe(newRoleData.name);
    newRoleId = role.id;

    // Test FindRoleByName
    const foundRole = await findRoleByName(newRoleData.name);
    expect(foundRole).not.toBeNull();
    expect(foundRole.id).toBe(newRoleId);
  });

  /**
   * @description Test FindRoleById and FindAllRoles
   * @returns {number} 200 OK.
   */
  it("should FIND the role by ID and FIND ALL roles successfully", async () => {
    // Test FindRoleById
    const foundRole = await findRoleById(newRoleId);
    expect(foundRole).not.toBeNull();
    expect(foundRole.name).toBe(newRoleData.name);

    // Test FindAllRoles (deve includere il nuovo ruolo + quelli seeded)
    const allRoles = await findAllRoles();
    expect(allRoles.length).toBeGreaterThan(5);
    const isPresent = allRoles.some((r) => r.id === newRoleId);
    expect(isPresent).toBe(true);
  });

  /**
   * @description Test UpdateRole
   * @returns {boolean} True on success.
   */
  it("should UPDATE the role name successfully", async () => {
    const updated = await updateRole(newRoleId, { name: updatedRoleName });

    expect(updated).toBe(true);

    const roleAfterUpdate = await findRoleById(newRoleId);
    expect(roleAfterUpdate.name).toBe(updatedRoleName);
  });

  /**
   * @description Test DeleteRole
   * @returns {boolean} True on success.
   */
  it("should DELETE the role successfully and fail to find it afterwards", async () => {
    const deleted = await deleteRole(newRoleId);

    expect(deleted).toBe(true);

    // Verifica che la riga sia stata rimossa
    const roleAfterDelete = await findRoleById(newRoleId);
    expect(roleAfterDelete).toBeNull();
  });

  /**
   * @description Test edge case: update/delete a non-existent role.
   * @returns {boolean} False on failure.
   */
  it("should return false when trying to update or delete a non-existent role", async () => {
    const nonExistentId = 999999;

    const updated = await updateRole(nonExistentId, { name: "no-op" });
    expect(updated).toBe(false);

    const deleted = await deleteRole(nonExistentId);
    expect(deleted).toBe(false);
  });
});
