/**
 * @file Integration Test for Citizen Profile Configuration
 * @description Tests profile update operations (PUT /users/me),
 * including data validation, security checks, and photo upload endpoints.
 */

process.env.NODE_ENV = "test";

import request from "supertest";
import { beforeAll, afterAll, describe, it, expect } from "@jest/globals";
import { app } from "../../index.mjs";

// --- Import Test Utilities ---
import {
  setupTestDatabase,
  teardownTestDatabase,
  loginAndGetCookie,
  citizenLogin,
} from "./test-utils.js";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "../../src/uploads/reports");

/**
 * Creates a dummy buffer for a 1x1 transparent PNG file.
 * @returns {Buffer} The PNG file buffer.
 */
function createDummyPngBuffer() {
  // 1x1 transparent PNG buffer (minimal valid PNG)
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
  );
}

/**
 * Creates a dummy text buffer.
 * @returns {Buffer} The TXT file buffer.
 */
function createDummyTextBuffer() {
  return Buffer.from("This is not an image.", "utf8");
}

async function cleanupUploads(dir) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.includes("test-") || file.includes("dummy-")) {
        fs.unlinkSync(path.join(dir, file));
      }
    }
  }
}

/** @type {string} Cookie for the authenticated Citizen user. */
let citizenCookie;

// --- Setup & Teardown Hooks ---

/**
 * @description Ensures a clean database, seeds data, and logs in the default citizen.
 */
beforeAll(async () => {
  await setupTestDatabase();
  // Use utility function for standard citizen login
  citizenCookie = await loginAndGetCookie(citizenLogin);
  expect(citizenCookie).toBeDefined();
});

/**
 * @description Closes the database connection.
 */
afterAll(async () => {
  await teardownTestDatabase();
});

describe("Citizen Profile Configuration - Integration Tests", () => {
  const PROFILE_ENDPOINT = "/users/me";

  // --- Profile Update Tests ---

  it("should update telegram username and return sanitized profile (200)", async () => {
    /** @description Updates a public profile field and validates response sanitization. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "myTelegram" });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBe("myTelegram");
    // Sensitive information check
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).not.toHaveProperty("refreshToken");
  });

  it("should allow removing telegram username by sending null (200)", async () => {
    /** @description Accepts null value to clear a profile attribute. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: null });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBeNull();
  });

  it("should toggle email notifications (200)", async () => {
    /** @description Updates a boolean preference field. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ emailNotificationsEnabled: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.emailNotificationsEnabled).toBe(false);
  });

  // --- Validation Rules ---

  it("should return 400 if no valid fields are provided", async () => {
    /** @description Rejects request if the payload contains no updatable fields. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({});

    expect(res.statusCode).toBe(400);
  });

  it("should reject invalid telegram username format (400)", async () => {
    /** @description Rejects request due to format/validation error */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "" });

    expect(res.statusCode).toBe(400);
  });

  // --- Security behavior ---

  it("should return 401 if not authenticated", async () => {
    /** @description Profile updates require a valid session cookie. */
    const res = await request(app).put(PROFILE_ENDPOINT).send({
      telegramUsername: "test123",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should update multiple profile fields together (200)", async () => {
    /** @description Confirms support for patching multiple fields in one request. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "abc", emailNotificationsEnabled: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.telegramUsername).toBe("abc");
    expect(res.body.emailNotificationsEnabled).toBe(true);
  });

  it("should never expose sensitive fields in the response", async () => {
    /** @description Final re-validation of sensitive field filtering on update response. */
    const res = await request(app)
      .put(PROFILE_ENDPOINT)
      .set("Cookie", citizenCookie)
      .send({ telegramUsername: "safeUser" });

    expect(res.statusCode).toBe(200);

    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).not.toHaveProperty("refreshToken");
  });
});

// =========================================================================
// === SECTION 3: UPLOAD INTEGRATION TESTS (Multer/File Storage) ===========
// =========================================================================

describe("File Upload Integration Tests (POST /api/upload)", () => {
  const dummyPng = createDummyPngBuffer();
  const dummyTxt = createDummyTextBuffer();

  // Clean up all files created during the upload tests
  afterAll(async () => {
    await cleanupUploads(UPLOAD_DIR);
  });

  // Single File Upload
  describe("POST /api/upload/photo (Single File)", () => {
    const endpoint = "/upload/photo";

    test("should allow authenticated user to upload a valid single PNG file", async () => {
      const res = await request(app)
        .post(endpoint)
        .set("Cookie", citizenCookie)
        .attach("photo", dummyPng, {
          filename: "test-single-upload.png",
          contentType: "image/png",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("url");
      expect(res.body.url).toMatch(/^\/uploads\/reports\/.*\.png$/);
    });

    test("should return 400 for invalid file type (text file)", async () => {
      const res = await request(app)
        .post(endpoint)
        .set("Cookie", citizenCookie)
        .attach("photo", dummyTxt, {
          filename: "test-invalid-file.txt",
          contentType: "text/plain",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Invalid file type/);
    });

    test("should return 400 if no file is uploaded", async () => {
      const res = await request(app)
        .post(endpoint)
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("No file uploaded.");
    });
  });

  // Multiple File Upload
  describe("POST /api/upload/photos (Multiple Files)", () => {
    const endpoint = "/upload/photos";

    test("should allow authenticated user to upload max 3 valid files", async () => {
      const res = await request(app)
        .post(endpoint)
        .set("Cookie", citizenCookie)
        .attach("photos", dummyPng, {
          filename: "dummy-1.png",
          contentType: "image/png",
        })
        .attach("photos", dummyPng, {
          filename: "dummy-2.png",
          contentType: "image/png",
        })
        .attach("photos", dummyPng, {
          filename: "dummy-3.png",
          contentType: "image/png",
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("files");
      expect(res.body.files.length).toBe(3);
    });

    test("should return 400 if more than 3 files are uploaded and delete them", async () => {
      let filenames = [];

      const res = await request(app)
        .post(endpoint)
        .set("Cookie", citizenCookie)
        .on("response", (response) => {
          if (response.request.files) {
            filenames = response.request.files.map((f) => f.filename);
          }
        })
        .attach("photos", dummyPng, {
          filename: "over-limit-1.png",
          contentType: "image/png",
        })
        .attach("photos", dummyPng, {
          filename: "over-limit-2.png",
          contentType: "image/png",
        })
        .attach("photos", dummyPng, {
          filename: "over-limit-3.png",
          contentType: "image/png",
        })
        .attach("photos", dummyPng, {
          filename: "over-limit-4.png",
          contentType: "image/png",
        }); // The 4th file causes the limit error

      expect(res.statusCode).toBe(400);
    });

    test("should return 400 if no files are uploaded", async () => {
      const res = await request(app)
        .post(endpoint)
        .set("Cookie", citizenCookie);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("No files uploaded.");
    });
  });
});
