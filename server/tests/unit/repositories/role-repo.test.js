import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- 1. MOCK DEL MODELLO SEQUELIZE ---
const mockRoleModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

// Mock dell'oggetto DB
const mockDb = {
  Role: mockRoleModel,
};

// Mock del modulo models
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

let RoleRepo;

describe("Role Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import dinamico del repo per usare i mock freschi
    RoleRepo = await import("../../../repositories/role-repo.mjs");
  });

  // --------------------------------------------------------------------------
  // createRole
  // --------------------------------------------------------------------------
  describe("createRole", () => {
    it("should call Role.create with correct data", async () => {
      const roleData = { name: "admin" };
      const createdRole = { id: 1, ...roleData };
      mockRoleModel.create.mockResolvedValue(createdRole);

      const result = await RoleRepo.createRole(roleData);

      expect(mockRoleModel.create).toHaveBeenCalledWith(roleData);
      expect(result).toEqual(createdRole);
    });
  });

  // --------------------------------------------------------------------------
  // findAllRoles
  // --------------------------------------------------------------------------
  describe("findAllRoles", () => {
    it("should call Role.findAll", async () => {
      const roles = [{ id: 1, name: "admin" }];
      mockRoleModel.findAll.mockResolvedValue(roles);

      const result = await RoleRepo.findAllRoles();

      expect(mockRoleModel.findAll).toHaveBeenCalled();
      expect(result).toEqual(roles);
    });
  });

  // --------------------------------------------------------------------------
  // findRoleById
  // --------------------------------------------------------------------------
  describe("findRoleById", () => {
    it("should call Role.findByPk with correct ID", async () => {
      const role = { id: 1, name: "admin" };
      mockRoleModel.findByPk.mockResolvedValue(role);

      const result = await RoleRepo.findRoleById(1);

      expect(mockRoleModel.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(role);
    });

    it("should return null if role not found", async () => {
      mockRoleModel.findByPk.mockResolvedValue(null);
      const result = await RoleRepo.findRoleById(999);
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // findRoleByName
  // --------------------------------------------------------------------------
  describe("findRoleByName", () => {
    it("should call Role.findOne with correct where clause", async () => {
      const role = { id: 1, name: "admin" };
      mockRoleModel.findOne.mockResolvedValue(role);

      const result = await RoleRepo.findRoleByName("admin");

      expect(mockRoleModel.findOne).toHaveBeenCalledWith({ where: { name: "admin" } });
      expect(result).toEqual(role);
    });

    it("should return null if role name not found", async () => {
      mockRoleModel.findOne.mockResolvedValue(null);
      const result = await RoleRepo.findRoleByName("nonexistent");
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // updateRole
  // --------------------------------------------------------------------------
  describe("updateRole", () => {
    const updateData = { name: "superadmin" };

    it("should return true if update affects at least 1 row", async () => {
      // Sequelize update restituisce [numero_righe_aggiornate]
      mockRoleModel.update.mockResolvedValue([1]);

      const result = await RoleRepo.updateRole(1, updateData);

      expect(mockRoleModel.update).toHaveBeenCalledWith(updateData, { where: { id: 1 } });
      expect(result).toBe(true);
    });

    it("should return false if no rows are updated", async () => {
      mockRoleModel.update.mockResolvedValue([0]);

      const result = await RoleRepo.updateRole(999, updateData);

      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // deleteRole
  // --------------------------------------------------------------------------
  describe("deleteRole", () => {
    it("should return true if delete affects at least 1 row", async () => {
      // Sequelize destroy restituisce il numero di righe cancellate (intero)
      mockRoleModel.destroy.mockResolvedValue(1);

      const result = await RoleRepo.deleteRole(1);

      expect(mockRoleModel.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(true);
    });

    it("should return false if no rows are deleted", async () => {
      mockRoleModel.destroy.mockResolvedValue(0);

      const result = await RoleRepo.deleteRole(999);

      expect(result).toBe(false);
    });
  });
});