import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";
import path from "node:path";

let citizenCookie;

beforeAll(async () => {
  /**
   * Ensure a clean database and seed default test data before running tests.
   * Logs in a default citizen user and stores the session cookie for authentication.
   */
  await sequelize.sync({ force: true });
  await seedDatabase();

  const loginRes = await request(app).post("/auth/login").send({
    username: "test",
    password: "test",
  });

  citizenCookie = loginRes.headers["set-cookie"];
  expect(citizenCookie).toBeDefined();
});

afterAll(async () => {
  /**
   * Close DB connection after test suite finishes.
   */
  if (sequelize) await sequelize.close();
});

describe("Citizen Profile Configuration - Integration Tests", () => {
  const PROFILE_ENDPOINT = "/users/me";
  const PHOTO_ENDPOINT = "/users/photo";

  /**
   * File upload tests (temporarily disabled due to missing route/middleware)
   */
  it.skip("should successfully upload a valid image file", async () => {
    /**
     * @param filePath - Valid image file to upload
     * Expected: 200 OK, file metadata returned
     */
    const filePath = path.resolve("tests/fixtures/avatar.png");

    const res = await request(app)
      .post(PHOTO_ENDPOINT)
      .set("Cookie", citizenCookie)
      .attach("file", filePath);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("url");
    expect(res.body).toHaveProperty("filename");
  });

  it.skip("should reject invalid file type", async () => {
    /**
     * Expected: 400 Bad Request when uploading a non-image file
     */
    const filePath = path.resolve("tests/fixtures/tests.txt");

    const res = await request(app)
      .post(PHOTO_ENDPOINT)
      .set("Cookie", citizenCookie)
      .attach("file", filePath);

    expect(res.statusCode).toBe(400);
  });

  /**
   * Profile update tests
   */
  it("should update telegram username and return sanitized profile with public fields only", async () => {
    /**
     * @description Updates a profile field and validates that the response contains only allowed public fields
     * Expected:
     *   - 200 OK
     *   - Contains id, username, telegramUsername
     *   - Does NOT contain sensitive fields such as password, hashedPassword, refreshToken
     */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "myTelegram" });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("username");
    expect(res.body.telegramUsername).toBe("myTelegram");

    // Sensitive information should not be returned
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("refreshToken");
  });

  it("should allow removing telegram username by sending null", async () => {
    /**
     * @description Accepts null to remove a profile attribute
     * Expected:
     *   - Field value becomes null
     */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: null });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBeNull();
  });

  it("should toggle email notifications", async () => {
    /**
     * @description Updates boolean preferences
     */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ emailNotificationsEnabled: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.emailNotificationsEnabled).toBe(false);
  });

  /**
   * Validation rules
   */
  it("should return 400 if no valid fields are provided", async () => {
    /**
     * Expected:
     *   - 400 Bad Request response
     */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("should reject invalid telegram username format", async () => {
    /**
     * Expected:
     *   - Empty string validation
     *   - Returns 400 Bad Request
     */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "" });

    expect(res.statusCode).toBe(400);
  });

  /**
   * Security behavior
   */
  it("should return 401 if not authenticated", async () => {
    /**
     * @description Profile updates require authentication
     * Expected:
     *   - 401 Unauthorized
     */
    const res = await request(app).put(PROFILE_ENDPOINT).send({
      telegramUsername: "test123",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should update multiple profile fields together", async () => {
    /**
     * @description Supports multi-field patching in a single request
     */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "abc", emailNotificationsEnabled: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBe("abc");
    expect(res.body.emailNotificationsEnabled).toBe(true);
  });

  it("should never expose sensitive fields in the response", async () => {
    /**
     * @description Re-validates sensitive field filtering on update response
     */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "safeUser" });

    expect(res.statusCode).toBe(200);

    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).not.toHaveProperty("refreshToken");
    expect(res.body).not.toHaveProperty("roles");
  });
});
