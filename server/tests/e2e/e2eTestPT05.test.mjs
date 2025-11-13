process.env.NODE_ENV = "test";

import request from "supertest";
import {
  beforeAll,
  afterAll,
  describe,
  it,
  expect,
  beforeEach,
} from "@jest/globals";
import { app } from "../../index.mjs";
import { sequelize } from "../../config/db/db-config.mjs";
import { seedDatabase } from "../../seeders/index.mjs";

let cookie;
let loggedInUserId;

const uniqueId = Date.now();
const citizenUser = {
  email: `e2e-citizen-${uniqueId}@example.com`,
  username: `e2e-citizen${uniqueId}`,
  firstName: "E2E",
  lastName: "Citizen",
  password: "Password123!",
};

const validReportPayload = {
  title: "Buca pericolosa in strada",
  description: "C'è una buca enorme davanti al civico 10 in Via Roma.",
  categoryId: 7,
  latitude: 45.0703,
  longitude: 7.6869,
  anonymous: false,
  photos: [
    "https://example.com/photos/buca1.jpg",
    "https://example.com/photos/buca2.jpg",
  ],
};

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await seedDatabase();
});

afterAll(async () => {
  if (sequelize) {
    await sequelize.close();
  }
});

/**
 * Preamble: User Authentication
 */
describe("Preamble: Authentication", () => {
  it("should register a new citizen user", async () => {
    const res = await request(app).post("/auth/register").send(citizenUser);
    expect(res.statusCode).toBe(201);
  });

  it("should login as the new citizen and store the cookie", async () => {
    const res = await request(app).post("/auth/login").send({
      username: citizenUser.username,
      password: citizenUser.password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("authenticated", true);

    cookie = res.headers["set-cookie"];
    loggedInUserId = res.body.user.id;

    expect(cookie).toBeDefined();
    expect(loggedInUserId).toBeDefined();
  });
});

describe("POST /reports (E2E Test)", () => {
  describe("Happy Path (User Story Success)", () => {
    it("should create a new report successfully (201)", async () => {
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(validReportPayload);

      expect(res.statusCode).toBe(201);

      expect(res.body.title).toBe(validReportPayload.title);
      expect(res.body.description).toBe(validReportPayload.description);
      expect(res.body.latitude).toBe(validReportPayload.latitude);
      
      expect(res.body.status).toBe("Pending Approval");
      expect(res.body.photos).toEqual(validReportPayload.photos);
      
      expect(res.body.user.id).toBe(loggedInUserId);
      expect(res.body.category.id).toBe(validReportPayload.categoryId);
      expect(res.body.category.name).toBe("Roads and Urban Furnishings");
    });
  });

  describe("Sad Paths (Security & Validation)", () => {
    it("should fail to create a report without authentication (401)", async () => {
      const res = await request(app).post("/reports").send(validReportPayload);
      
      expect(res.statusCode).toBe(401);
    });

    it("should fail with missing 'title' (400)", async () => {
      const payload = { ...validReportPayload, title: "" };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Title is required.");
    });

    it("should fail with invalid 'categoryId' (400)", async () => {
      const payload = { ...validReportPayload, categoryId: "non-un-numero" };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Valid categoryId is required.");
    });

    it("should fail with invalid 'latitude' (400)", async () => {
      const payload = { ...validReportPayload, latitude: 200 }; // > 90
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Latitude must be a number between -90 and 90.");
    });

    it("should fail if 'photos' array is empty (min 1) (400)", async () => {
      const payload = { ...validReportPayload, photos: [] }; // 0 foto
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Photos array must contain between 1 and 3 items.");
    });

    it("should fail if 'photos' array has more than 3 items (max 3) (400)", async () => {
      const payload = {
        ...validReportPayload,
        photos: ["foto1.jpg", "foto2.jpg", "foto3.jpg", "foto4.jpg"], // 4 foto
      };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toContain("Photos array must contain between 1 and 3 items.");
    });
    
    it("should fail if 'categoryId' does not exist in the DB (400)", async () => {
      const payload = { ...validReportPayload, categoryId: 9999 };
      const res = await request(app)
        .post("/reports")
        .set("Cookie", cookie)
        .send(payload);
        
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Category with id "9999" not found.');
    });
  });
});