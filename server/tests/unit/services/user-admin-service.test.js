import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// 1. DEFINIZIONE DEI MOCK (GLOBALI NEL FILE)
const mockUpdateUser = jest.fn();
const mockFindAllUsers = jest.fn();
const mockFindRoleByName = jest.fn();

// 2. CONFIGURAZIONE DEI MODULI MOCK
// Mock del repository User (Ci servono solo update e findAll ora)
jest.unstable_mockModule("../../../repositories/user-repo.mjs", () => ({
  updateUser: mockUpdateUser,
  findAllUsers: mockFindAllUsers,
}));

// Mock del repository Role
jest.unstable_mockModule("../../../repositories/role-repo.mjs", () => ({
  findRoleByName: mockFindRoleByName,
}));

// Mock utility
jest.unstable_mockModule("../../../shared/utils/userUtils.mjs", () => ({
  sanitizeUser: (u) => u,
}));

let UserAdminService;

describe("UserAdminService (Unit)", () => {
  beforeAll(async () => {
    // Importiamo il servizio
    const serviceModule = await import("../../../services/user-admin-service.mjs");
    UserAdminService = serviceModule.UserAdminService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // getUsers
  // --------------------------------------------------------------------------
  describe("getUsers", () => {
    it("should return all users sanitized", async () => {
      const mockUsers = [{ id: 1, password: "secret" }, { id: 2, password: "secret" }];
      mockFindAllUsers.mockResolvedValue(mockUsers);

      const result = await UserAdminService.getUsers();

      expect(mockFindAllUsers).toHaveBeenCalled();
      // Nota: sanitizeUser è mockata per ritornare l'utente così com'è in questo file,
      // ma verifichiamo che torni l'array.
      expect(result).toHaveLength(2);
    });
  });
});