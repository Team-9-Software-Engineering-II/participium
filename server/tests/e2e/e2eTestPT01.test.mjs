import {seedDatabase} from "../../seeders/index.mjs";

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";
let cookie;
let adminCookie;
const uniqueId = Date.now();

const adminLogin = {
  username: "admin",
  password: "password123",
};

const testUser = {
  email: `e2euser-${uniqueId}@example.com`,
  username: `e2euser${uniqueId}`,
  firstName: "E2E",
  lastName: "Tester",
  password: "Password123!",
};
// --- Test Hooks (Setup & Teardown) ---

beforeAll(async () => {
  // Reset the test database and run seeders
  await sequelize.sync({ force: true });
  await seedDatabase();
  const res = await request(app).post("/auth/login").send(adminLogin);
  adminCookie = res.headers["set-cookie"];
});

afterAll(async () => {
  // Close the database connection after all tests
  if (sequelize) {
    await sequelize.close();
  }
});

describe("API Authentication E2E Flow", () => {
  describe("POST/auth/register (e2e)", () => {
    it("should register a new user successfully (201)", async () => {
      const res = await request(app).post("/auth/register").send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.email).toBe(testUser.email);
    });

    it("should fail to register with existing email/username (409)", async () => {
      const res = await request(app).post("/auth/register").send(testUser);

      expect(res.statusCode).toBe(409);
    });

    it("should fail to register with an INVALID email format (400)", async () => {
      const invalidUser = {
        email: "invalidEmail",
        username: `invaliduser${Date.now()}`,
        firstName: "E2E",
        lastName: "Tester",
        password: "Password123!",
      };

      const res = await request(app).post("/auth/register").send(invalidUser);

      expect(res.statusCode).toBe(400);
    });

    it("should fail to register if the request body is missing or empty (400)", async () => {
      const res = await request(app).post("/auth/register");
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST/auth/login (e2e)", () => {
    it("should login successfully (200) and set session cookie", async () => {
      const res = await request(app).post("/auth/login").send({
        username: testUser.username,
        password: testUser.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.username).toBe(testUser.username);

      cookie = res.headers["set-cookie"];
      expect(cookie).toBeDefined();
    });

    it("should fail login with invalid credentials (401)", async () => {
      const res = await request(app).post("/auth/login").send({
        username: testUser.username,
        password: "WrongPassword123",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET/auth/session (e2e)", () => {
    it("should return session info (200) using session cookie", async () => {
      const res = await request(app)
        .get("/auth/session")
        .set("Cookie", adminCookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("authenticated", true);
      expect(res.body.user.username).toBe(adminLogin.username);
    });

    it("should fail session check if no cookie is provided (401)", async () => {
      const res = await request(app).get("/auth/session");
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe("User not authenticated");
    });
  });

  describe("POST/auth/logout (e2e)", () => {
    it("should logout successfully (204) using session cookie", async () => {
      const res = await request(app).post("/auth/logout").set("Cookie", cookie);

      expect(res.statusCode).toBe(204);
    });
  });
});
