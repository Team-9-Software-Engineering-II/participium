import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import AppError from "../../../shared/utils/app-error.mjs";

// --- 1. DEFINIZIONE DEI MOCK GLOBALI ---
const mockUpdateUser = jest.fn();
const mockFindAllUsers = jest.fn();
const mockFindUserById = jest.fn(); // <--- AGGIUNTO
const mockDeleteUser = jest.fn();   // <--- AGGIUNTO (Risolve il tuo SyntaxError)

const mockFindRoleByName = jest.fn();
const mockFindRoleById = jest.fn(); // <--- AGGIUNTO (Serve per ensureAllRolesExist)

// Mock per la transazione Sequelize
const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
};
const mockSequelize = {
  transaction: jest.fn(() => Promise.resolve(mockTransaction)),
};

// --- 2. CONFIGURAZIONE DEI MODULI MOCK ---

// Mock del repository User
jest.unstable_mockModule("../../../repositories/user-repo.mjs", () => ({
  updateUser: mockUpdateUser,
  findAllUsers: mockFindAllUsers,
  findUserById: mockFindUserById, // <--- Ora esportiamo anche questo
  deleteUser: mockDeleteUser,     // <--- E questo!
}));

// Mock del repository Role
jest.unstable_mockModule("../../../repositories/role-repo.mjs", () => ({
  findRoleByName: mockFindRoleByName,
  findRoleById: mockFindRoleById, // <--- Export necessario per la nuova logica
}));

// Mock di Sequelize (db models)
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: {
    sequelize: mockSequelize,
  },
}));

// Mock utility
jest.unstable_mockModule("../../../shared/utils/userUtils.mjs", () => ({
  sanitizeUser: (u) => u,
}));

let UserAdminService;

describe("UserAdminService (Unit)", () => {
  beforeAll(async () => {
    // Importiamo il servizio DOPO aver configurato i mock
    const serviceModule = await import("../../../services/user-admin-service.mjs");
    UserAdminService = serviceModule.UserAdminService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // TEST: getUsers (LEGACY)
  // --------------------------------------------------------------------------
  describe("getUsers", () => {
    it("should return all users sanitized", async () => {
      const mockUsers = [{ id: 1, password: "secret" }, { id: 2, password: "secret" }];
      mockFindAllUsers.mockResolvedValue(mockUsers);

      const result = await UserAdminService.getUsers();

      expect(mockFindAllUsers).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: updateUserRoles (NUOVO - TASK ATTUALE)
  // --------------------------------------------------------------------------
  describe("updateUserRoles", () => {
    const userId = 10;
    const roleIds = [1, 2];

    it("should successfully update roles within a transaction", async () => {
      // 1. Setup: L'utente esiste e ha il metodo magico setRoles
      // IMPORTANTE: Dobbiamo mockare setRoles perché è un metodo di istanza Sequelize
      const mockUserInstance = {
        id: userId,
        setRoles: jest.fn().mockResolvedValue(true), 
      };
      
      mockFindUserById.mockResolvedValue(mockUserInstance);
      
      // 2. Setup: I ruoli esistono (findRoleById ritorna qualcosa non-null)
      mockFindRoleById.mockResolvedValue({ id: 1, name: "role" });

      // 3. Esecuzione
      await UserAdminService.updateUserRoles(userId, roleIds);

      // 4. Verifiche
      expect(mockFindUserById).toHaveBeenCalledWith(userId);
      // Verifica che apra la transazione
      expect(mockSequelize.transaction).toHaveBeenCalled();
      // Verifica che chiami setRoles passando la transazione
      expect(mockUserInstance.setRoles).toHaveBeenCalledWith(roleIds, {
        transaction: mockTransaction,
      });
      // Verifica commit
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it("should throw 404 if user does not exist", async () => {
      mockFindUserById.mockResolvedValue(null); // Utente non trovato

      await expect(UserAdminService.updateUserRoles(userId, roleIds))
        .rejects
        .toThrow(new AppError(`User with ID ${userId} not found.`, 404));

      // Non deve aprire transazioni se l'utente non c'è
      expect(mockSequelize.transaction).not.toHaveBeenCalled();
    });

    it("should throw 404 if a role does not exist", async () => {
      mockFindUserById.mockResolvedValue({ id: userId });
      mockFindRoleById.mockResolvedValue(null); // Ruolo non trovato

      await expect(UserAdminService.updateUserRoles(userId, roleIds))
        .rejects
        .toThrow(AppError); // L'errore specifico sui ruoli mancanti

      expect(mockSequelize.transaction).not.toHaveBeenCalled();
    });

    it("should rollback transaction if setRoles fails", async () => {
      const mockUserInstance = {
        id: userId,
        setRoles: jest.fn().mockRejectedValue(new Error("DB Error")), // Errore nel DB
      };
      mockFindUserById.mockResolvedValue(mockUserInstance);
      mockFindRoleById.mockResolvedValue({ id: 1 });

      await expect(UserAdminService.updateUserRoles(userId, roleIds))
        .rejects
        .toThrow("DB Error");

      // Deve aver fatto Rollback
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });
  });
});