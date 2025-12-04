import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- 1. MOCK DELLE DIPENDENZE ---

const mockCreateUser = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockFindUserByUsername = jest.fn();
const mockFindUserById = jest.fn();
const mockFindRoleByName = jest.fn();
const mockFindRoleById = jest.fn();

jest.unstable_mockModule("../../../repositories/user-repo.mjs", () => ({
  createUser: mockCreateUser,
  findUserByEmail: mockFindUserByEmail,
  findUserByUsername: mockFindUserByUsername,
  findUserById: mockFindUserById,
}));

jest.unstable_mockModule("../../../repositories/role-repo.mjs", () => ({
  findRoleByName: mockFindRoleByName,
  findRoleById: mockFindRoleById,
}));

// NUOVO MOCK: Technical Office Repo
const mockFindTechnicalOfficeById = jest.fn();
jest.unstable_mockModule("../../../repositories/technical-office-repo.mjs", () => ({
  findTechnicalOfficeById: mockFindTechnicalOfficeById,
}));

const mockHash = jest.fn();
const mockCompare = jest.fn();
jest.unstable_mockModule("bcrypt", () => ({
  __esModule: true,
  default: { hash: mockHash, compare: mockCompare },
}));

// Mock di sanitizeUser
const mockSanitizeUser = jest.fn((user) => {
  const { hashedPassword, ...rest } = user;
  // Simuliamo la logica del sanitize per il ruolo
  if (rest.role && typeof rest.role === 'object') {
      rest.role = { id: rest.role.id, name: rest.role.name };
  }
  return rest;
});
jest.unstable_mockModule("../../../shared/utils/userUtils.mjs", () => ({
  sanitizeUser: mockSanitizeUser,
}));

// --- 2. TEST SUITE ---

let AuthService;

describe("AuthService (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const authServiceModule = await import("../../../services/auth-service.mjs");
    AuthService = authServiceModule.AuthService;
  });

  // Dati comuni
  const mockUserInput = {
    email: "test@example.com",
    username: "testuser",
    password: "password123",
    firstName: "Test",
    lastName: "User",
  };
  
  const mockStaffInput = {
    ...mockUserInput,
    roleId: 4,
    technicalOfficeId: 1
  };

  const mockPlainUser = { id: 1, ...mockUserInput, hashedPassword: "hashed", roleId: 1 };
  const mockSequelizeUser = { ...mockPlainUser, get: jest.fn().mockReturnValue(mockPlainUser) };
  const expectedSanitizedUser = { id: 1, ...mockUserInput, roleId: 1 }; // password rimossa

  // --------------------------------------------------------------------------
  // registerUser
  // --------------------------------------------------------------------------
  describe("registerUser", () => {
    it("should register a new user successfully (assigning citizen role)", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindRoleByName.mockResolvedValue({ id: 1, name: 'citizen' });
      mockHash.mockResolvedValue("hashed");
      mockCreateUser.mockResolvedValue(mockSequelizeUser);
      mockFindUserById.mockResolvedValue(mockSequelizeUser);

      const result = await AuthService.registerUser(mockUserInput);

      expect(mockFindRoleByName).toHaveBeenCalledWith("citizen");
      expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ roleId: 1 }));
      expect(result).toEqual(expectedSanitizedUser);
    });
    
    // ... (Altri test di registerUser per errori 409, 400 email format, ecc.
    // Puoi ricopiarli dal vecchio file se vuoi la coverage 100% su quei rami)
    it("should throw 500 if default citizen role not found", async () => {
        mockFindUserByEmail.mockResolvedValue(null);
        mockFindUserByUsername.mockResolvedValue(null);
        mockFindRoleByName.mockResolvedValue(null); // Ruolo non trovato
        
        await expect(AuthService.registerUser(mockUserInput)).rejects.toThrow("Default citizen role not found");
    });
  });

  // --------------------------------------------------------------------------
  // registerMunicipalOrStaffUser (NUOVO)
  // --------------------------------------------------------------------------
  describe("registerMunicipalOrStaffUser", () => {
    it("should register staff user successfully", async () => {
      // Setup
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindTechnicalOfficeById.mockResolvedValue({ id: 1, name: "Office" });
      mockFindRoleById.mockResolvedValue({ id: 4, name: "staff" }); // Role exists
      mockHash.mockResolvedValue("hashed");
      
      // FIX: Aggiorniamo anche il valore restituito da .get()!
      const staffPlain = { ...mockPlainUser, roleId: 4, technicalOfficeId: 1 };
      const createdStaff = { 
          ...mockSequelizeUser, 
          ...staffPlain,
          get: jest.fn().mockReturnValue(staffPlain) 
      };

      mockCreateUser.mockResolvedValue(createdStaff);
      mockFindUserById.mockResolvedValue(createdStaff);

      const result = await AuthService.registerMunicipalOrStaffUser(mockStaffInput);

      expect(mockFindTechnicalOfficeById).toHaveBeenCalledWith(1);
      expect(mockFindRoleById).toHaveBeenCalledWith(4);
      expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ roleId: 4, technicalOfficeId: 1 }));
      expect(result.roleId).toBe(4);
    });

    it("should throw 404 if technical office does not exist", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindTechnicalOfficeById.mockResolvedValue(null); // Office missing

      await expect(AuthService.registerMunicipalOrStaffUser(mockStaffInput))
        .rejects.toThrow("Technical office with id 1 not found.");
        
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("should throw 404 if role does not exist", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindTechnicalOfficeById.mockResolvedValue({ id: 1 });
      mockFindRoleById.mockResolvedValue(null); // Role missing

      await expect(AuthService.registerMunicipalOrStaffUser(mockStaffInput))
        .rejects.toThrow("Role with id 4 not found");
    });
    
    it("should throw 409 if email exists", async () => {
       mockFindUserByEmail.mockResolvedValue({});
       await expect(AuthService.registerMunicipalOrStaffUser(mockStaffInput))
         .rejects.toHaveProperty("statusCode", 409);
    });
  });

  // --------------------------------------------------------------------------
  // validateCredentials
  // --------------------------------------------------------------------------
  describe("validateCredentials", () => {
    it("should return user if credentials match", async () => {
        mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);
        mockCompare.mockResolvedValue(true);
        const res = await AuthService.validateCredentials("user", "pass");
        expect(res).toEqual(expectedSanitizedUser);
    });
    // ... altri test ...
  });

  // --------------------------------------------------------------------------
  // findUserById
  // --------------------------------------------------------------------------
  describe("findUserById", () => {
    it("should return user if found", async () => {
        mockFindUserById.mockResolvedValue(mockSequelizeUser);
        const res = await AuthService.findUserById(1);
        expect(res).toEqual(expectedSanitizedUser);
    });
  });

});