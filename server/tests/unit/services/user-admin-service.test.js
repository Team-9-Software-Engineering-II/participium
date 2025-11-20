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

  // --- NOTA: Abbiamo rimosso i test di createMunicipalityUser perché la funzione è stata rimossa ---

  // --------------------------------------------------------------------------
  // assignUserRole
  // --------------------------------------------------------------------------
  describe("assignUserRole", () => {
    const userId = 1;
    const roleName = "technical_staff";
    const mockRole = { id: 4, name: "technical_staff" };

    it("should successfully assign a role to a user", async () => {
      // Setup
      mockFindRoleByName.mockResolvedValue(mockRole);
      mockUpdateUser.mockResolvedValue(true); // Update riuscito

      // Esecuzione
      const result = await UserAdminService.assignUserRole(userId, roleName);

      // Verifica
      expect(mockFindRoleByName).toHaveBeenCalledWith(roleName);
      expect(mockUpdateUser).toHaveBeenCalledWith(userId, { roleId: mockRole.id });
      expect(result).toBe(true);
    });

    it("should throw 400 if role name does not exist", async () => {
      mockFindRoleByName.mockResolvedValue(null); // Ruolo non trovato

      await expect(UserAdminService.assignUserRole(userId, "fake_role"))
        .rejects.toHaveProperty("statusCode", 400);

      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("should throw 404 if user update fails (user not found)", async () => {
      mockFindRoleByName.mockResolvedValue(mockRole);
      mockUpdateUser.mockResolvedValue(false); // Update fallito (utente non trovato)

      await expect(UserAdminService.assignUserRole(999, roleName))
        .rejects.toHaveProperty("statusCode", 404);
    });
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