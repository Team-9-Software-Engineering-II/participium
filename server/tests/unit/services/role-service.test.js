import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// Mock del repository Role
const mockFindAllRoles = jest.fn();
const mockFindRoleByName = jest.fn();

jest.unstable_mockModule("../../../repositories/role-repo.mjs", () => ({
  findAllRoles: mockFindAllRoles,
  findRoleByName: mockFindRoleByName,
}));

let RoleService;

describe("RoleService (Unit)", () => {
  beforeAll(async () => {
    const serviceModule = await import("../../../services/role-service.mjs");
    RoleService = serviceModule.RoleService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRoles = [
    { id: 1, name: "citizen" },
    { id: 2, name: "admin" },
    { id: 3, name: "municipality_public_relations_officer" },
    { id: 4, name: "technical_staff" },
  ];

  describe("getAssignableRoles", () => {
    it("should return only assignable roles (excluding citizen and admin)", async () => {
      mockFindAllRoles.mockResolvedValue(mockRoles);

      const result = await RoleService.getAssignableRoles();

      expect(mockFindAllRoles).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 3, name: "municipality_public_relations_officer" },
        { id: 4, name: "technical_staff" },
      ]);
    });

    it("should filter out citizen role", async () => {
      mockFindAllRoles.mockResolvedValue(mockRoles);
      const result = await RoleService.getAssignableRoles();
      expect(result.find(r => r.name.toLowerCase() === "citizen")).toBeUndefined();
    });

    it("should filter out admin role", async () => {
      mockFindAllRoles.mockResolvedValue(mockRoles);
      const result = await RoleService.getAssignableRoles();
      expect(result.find(r => r.name.toLowerCase() === "admin")).toBeUndefined();
    });

    it("should return empty array if only citizen and admin roles exist", async () => {
      const limitedRoles = [
        { id: 1, name: "citizen" },
        { id: 2, name: "admin" },
      ];
      mockFindAllRoles.mockResolvedValue(limitedRoles);
      const result = await RoleService.getAssignableRoles();
      expect(result).toHaveLength(0);
    });

    it("should handle empty roles table", async () => {
      mockFindAllRoles.mockResolvedValue([]);
      const result = await RoleService.getAssignableRoles();
      expect(result).toHaveLength(0);
    });
    
    it("should handle database errors", async () => {
      mockFindAllRoles.mockRejectedValue(new Error("DB Error"));
      await expect(RoleService.getAssignableRoles()).rejects.toThrow("DB Error");
    });
  });
});