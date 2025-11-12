process.env.NODE_ENV = "test";

import request from "supertest";
import {beforeAll, afterAll, describe, it, expect} from "@jest/globals";
import {app} from "../../index.mjs";
import {sequelize} from "../../config/db/db-config.mjs";
import {seedDatabase} from "../../seeders/index.mjs";
import db from "../../models/index.mjs"

let adminCookie;
const uniqueId = Date.now();

// --- Admin user for authentication ---
const adminUser = {
    email: `admin-${uniqueId}@example.com`,
    username: `admin${uniqueId}`,
    firstName: "Admin",
    lastName: "User",
    password: "AdminPass123!",
};

// --- Municipality user test data ---
const municipalityUser = {
    email: `municipality-${uniqueId}@example.com`,
    username: `muni${uniqueId}`,
    firstName: "Municipal",
    lastName: "User",
    password: "MunicipalPass123!",
};

beforeAll(async () => {
    await sequelize.sync({force: true});
    await seedDatabase();

    // Fetch User and Role models
    const User = db.User;
    const Role = db.Role;

    // Register admin
    await request(app).post("/auth/register").send(adminUser);

    // Find id of 'admin' role
    const adminRole = await Role.findOne({where: {name: 'admin'}});
    if (!adminRole) {
        throw new Error("Admin role not found in database.");
    }
    const admin = await User.findOne({where: {username: adminUser.username}});

    if (admin) {
        await admin.update({roleId: adminRole.id});// Assign admin role
    }

    // Login as admin to get cookie
    const adminLoginRes = await request(app).post("/auth/login").send({
        username: adminUser.username,
        password: adminUser.password,
    });

    expect(adminLoginRes.statusCode).toBe(200);
    adminCookie = adminLoginRes.headers["set-cookie"];
    expect(adminCookie).toBeDefined();
});

afterAll(async () => {
    if (sequelize) await sequelize.close();
});

describe("Municipality User Management E2E", () => {
    describe("createMunicipalityUser", () => {
        it("should create a new municipality user successfully (201)", async () => {
            const res = await request(app)
                .post("/admin/users")
                .set("Cookie", adminCookie)
                .send(municipalityUser);

            expect(res.statusCode).toBe(201);
            expect(res.body).not.toHaveProperty("password"); // Password should not be returned
        });

        it("should fail to create with existing email (409)", async () => {
            const res = await request(app)
                .post("/admin/users")
                .set("Cookie", adminCookie)
                .send({...municipalityUser, username: `another${uniqueId}`});

            expect(res.statusCode).toBe(409);
        });

        it("should fail to create with existing username (409)", async () => {
            const res = await request(app)
                .post("/admin/users")
                .set("Cookie", adminCookie)
                .send({
                    ...municipalityUser,
                    email: `another-${uniqueId}@example.com`,
                });

            expect(res.statusCode).toBe(409);
        });

        it("should fail if request body is invalid or missing (400)", async () => {
            const res = await request(app)
                .post("/admin/users")
                .set("Cookie", adminCookie)
                .send({}); // empty body

            expect(res.statusCode).toBe(400);
        });

        it("should return 401 if not authenticated", async () => {
            const unauthenticatedUser = {
                email: `unauth-${Date.now()}@example.com`,
                username: `unauth${Date.now()}`,
                firstName: "NoAuth",
                lastName: "User",
                password: "Password123!",
            };
            const res = await request(app)
                .post("/admin/users")
                .send(unauthenticatedUser);

            expect(res.statusCode).toBe(401);
        });
    });

    describe("GET /admin/users (getAllUsers)", () => {
        it("should return all users (200) for authenticated admin", async () => {
            const res = await request(app)
                .get("/admin/users")
                .set("Cookie", adminCookie);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.some((u) => u.email === municipalityUser.email)).toBe(
                true
            );
        });

        it("should return 401 if not authenticated", async () => {
            const res = await request(app).get("/admin/users");
            expect(res.statusCode).toBe(401);
        });
    });
});
