import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// --- 1. MOCK DEL SERVIZIO ---
const mockGetAssignableRoles = jest.fn();

jest.unstable_mockModule("../../../services/role-service.mjs", () => ({
  RoleService: { getAssignableRoles: mockGetAssignableRoles },
}));

// --- 2. TEST SUITE ---
let RoleController;

describe("Role Controller (Unit)", () => {
  // Import dinamico del controller
  beforeAll(async () => {
    const module = await import("../../../controllers/role-controller.js");
    RoleController = module;
  });

  let req, res, next;

  // Reset dei mock prima di ogni test
  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(), // Permette il chaining: res.status().json()
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("getAssignableRoles", () => {
    it("should return list of roles with status 200", async () => {
      // Setup: Il servizio restituisce un array di ruoli
      const mockRoles = [{ id: 3, name: "municipality_public_relations_officer" }];
      mockGetAssignableRoles.mockResolvedValue(mockRoles);

      // Esecuzione
      await RoleController.getAssignableRoles(req, res, next);

      // Verifiche
      expect(mockGetAssignableRoles).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRoles);
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next(error) if service fails", async () => {
      // Setup: Il servizio lancia un errore
      const error = new Error("Database connection failed");
      mockGetAssignableRoles.mockRejectedValue(error);

      // Esecuzione
      await RoleController.getAssignableRoles(req, res, next);

      // Verifiche
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});