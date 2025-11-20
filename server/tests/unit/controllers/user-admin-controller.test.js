import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// --- 1. MOCK DELLE DIPENDENZE ---

// Mock per AuthService (usato da createMunicipalityUser)
const mockRegisterUser = jest.fn();
jest.unstable_mockModule("../../../services/auth-service.mjs", () => ({
  AuthService: { registerUser: mockRegisterUser },
}));

// Mock per UserAdminService (usato da assignUserRole e getAllUsers)
const mockGetUsers = jest.fn();
const mockAssignUserRole = jest.fn();

jest.unstable_mockModule("../../../services/user-admin-service.mjs", () => ({
  UserAdminService: {
    getUsers: mockGetUsers,
    assignUserRole: mockAssignUserRole,
  },
}));

// Mock del validatore
const mockValidateRegistrationInput = jest.fn();
jest.unstable_mockModule("../../../shared/validators/user-registration-validator.mjs", () => ({
  validateRegistrationInput: mockValidateRegistrationInput,
}));

// --- 2. TEST SUITE ---

let UserAdminController;

describe("UserAdminController (Unit)", () => {
  // Import dinamico del controller
  beforeAll(async () => {
    const controllerModule = await import("../../../controllers/user-admin-controller.js");
    UserAdminController = controllerModule;
  });

  let req, res, next;

  // Helper per resettare req/res prima di ogni test
  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  // --------------------------------------------------------------------------
  // TEST: createMunicipalityUser
  // --------------------------------------------------------------------------
  describe("createMunicipalityUser", () => {
    it("should create a new municipality user and return 201", async () => {
      const validatedInput = { email: "test@example.com", password: "Password123!" };
      const newUser = { id: 1, email: "test@example.com" };

      // Configura i mock
      mockValidateRegistrationInput.mockReturnValue(validatedInput);
      mockRegisterUser.mockResolvedValue(newUser); 
      
      await UserAdminController.createMunicipalityUser(req, res, next);

      expect(mockValidateRegistrationInput).toHaveBeenCalledWith(req, res);
      expect(mockRegisterUser).toHaveBeenCalledWith(validatedInput);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newUser);
      expect(next).not.toHaveBeenCalled();
    });

    it("should stop execution if validateRegistrationInput returns false/null", async () => {
      mockValidateRegistrationInput.mockReturnValue(null);

      await UserAdminController.createMunicipalityUser(req, res, next);

      expect(mockRegisterUser).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Il validatore ha già risposto
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next(error) if AuthService.registerUser throws", async () => {
      const error = new Error("DB error");
      mockValidateRegistrationInput.mockReturnValue({ email: "x@y.com" });
      mockRegisterUser.mockRejectedValue(error);

      await UserAdminController.createMunicipalityUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: assignUserRole (NUOVO - Copre righe 27-40)
  // --------------------------------------------------------------------------
  describe("assignUserRole", () => {
    beforeEach(() => {
      req.params.userId = "5";
      req.body.role = "technical_staff";
    });

    it("should assign role successfully and return 200", async () => {
      // Setup: Il servizio completa l'operazione con successo
      mockAssignUserRole.mockResolvedValue(true);

      await UserAdminController.assignUserRole(req, res, next);

      // Verifica che il controller chiami il servizio convertendo l'ID in numero
      expect(mockAssignUserRole).toHaveBeenCalledWith(5, "technical_staff");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Role updated successfully." });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 if role is missing in body", async () => {
      req.body.role = undefined; // Ruolo mancante

      await UserAdminController.assignUserRole(req, res, next);

      expect(mockAssignUserRole).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Missing required 'role' field." });
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next(error) if service throws an error", async () => {
      const error = new Error("Role not found");
      mockAssignUserRole.mockRejectedValue(error);

      await UserAdminController.assignUserRole(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getAllUsers (NUOVO - Copre riga 52)
  // --------------------------------------------------------------------------
  describe("getAllUsers", () => {
    it("should return list of users with status 200", async () => {
      const mockUsers = [{ id: 1, username: "admin" }];
      mockGetUsers.mockResolvedValue(mockUsers);

      await UserAdminController.getAllUsers(req, res, next);

      expect(mockGetUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next(error) if service throws an error", async () => {
      const error = new Error("Database fail");
      mockGetUsers.mockRejectedValue(error);

      await UserAdminController.getAllUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});