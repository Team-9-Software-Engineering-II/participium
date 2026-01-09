import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
} from "@jest/globals";

// --- 1. MOCK DELLE DIPENDENZE ---

// Mock per AuthService
const mockRegisterMunicipalOrStaffUser = jest.fn();
jest.unstable_mockModule("../../../services/auth-service.mjs", () => ({
  AuthService: {
    registerMunicipalOrStaffUser: mockRegisterMunicipalOrStaffUser,
  },
}));

// Mock per UserAdminService
// MOCKIAMO SOLO QUELLO CHE CI SERVE: getUsers, updateUserRoles, e deleteUser
const mockGetUsers = jest.fn();
const mockUpdateUserRoles = jest.fn();
const mockDeleteUser = jest.fn();

jest.unstable_mockModule("../../../services/user-admin-service.mjs", () => ({
  UserAdminService: {
    getUsers: mockGetUsers,
    updateUserRoles: mockUpdateUserRoles,
    deleteUser: mockDeleteUser,
  },
}));

// Mock del validatore registrazione (Legacy)
const mockValidateRegistrationInput = jest.fn();
jest.unstable_mockModule(
  "../../../shared/validators/user-registration-validator.mjs",
  () => ({
    validateRegistrationInputForMunicipalOrStaffCreation:
      mockValidateRegistrationInput,
  })
);

// Mock del validatore aggiornamento ruoli (TUO - NUOVO)
const mockValidateUserRoleUpdateInput = jest.fn();
jest.unstable_mockModule(
  "../../../shared/validators/user-role-update-validator.mjs",
  () => ({
    validateUserRoleUpdateInput: mockValidateUserRoleUpdateInput,
  })
);

// Mock dei validatori comuni (TUO - per isIdNumberAndPositive)
jest.unstable_mockModule(
  "../../../shared/validators/common-validator.mjs",
  () => ({
    isIdNumberAndPositive: jest.fn((id) => !isNaN(id) && id > 0),
  })
);

// --- 2. TEST SUITE ---

let UserAdminController;

describe("UserAdminController (Unit)", () => {
  beforeAll(async () => {
    const controllerModule = await import(
      "../../../controllers/user-admin-controller.js"
    );
    UserAdminController = controllerModule;
  });

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  // --------------------------------------------------------------------------
  // TEST: createMunicipalityUser (LEGACY - FIXATO)
  // --------------------------------------------------------------------------
  describe("createMunicipalityUser", () => {
    it("should create a new municipality user and return 201", async () => {
      const validatedInput = {
        email: "test@example.com",
        password: "Password123!",
      };
      const newUser = { id: 1, email: "test@example.com" };

      mockValidateRegistrationInput.mockReturnValue(validatedInput);
      mockRegisterMunicipalOrStaffUser.mockResolvedValue(newUser);

      await UserAdminController.createMunicipalityUser(req, res, next);

      expect(mockValidateRegistrationInput).toHaveBeenCalledWith(req, res);
      expect(mockRegisterMunicipalOrStaffUser).toHaveBeenCalledWith(
        validatedInput
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newUser);
    });

    it("should stop execution if validator returns false/null", async () => {
      mockValidateRegistrationInput.mockReturnValue(null);
      await UserAdminController.createMunicipalityUser(req, res, next);
      expect(mockRegisterMunicipalOrStaffUser).not.toHaveBeenCalled();
    });

    it("should call next(error) if AuthService fails", async () => {
      const error = new Error("DB error");
      mockValidateRegistrationInput.mockReturnValue({ email: "x@y.com" });
      mockRegisterMunicipalOrStaffUser.mockRejectedValue(error);
      await UserAdminController.createMunicipalityUser(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getAllUsers (LEGACY - FIXATO)
  // --------------------------------------------------------------------------
  describe("getAllUsers", () => {
    it("should return list of users with status 200", async () => {
      // Nota: Ora l'oggetto utente potrebbe essere più complesso col nuovo DB,
      // ma al controller basta sapere che riceve un array.
      const mockUsers = [{ id: 1, username: "admin", roles: [{id:1, name:"admin"}] }];
      mockGetUsers.mockResolvedValue(mockUsers);

      await UserAdminController.getAllUsers(req, res, next);

      expect(mockGetUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should call next(error) if service throws", async () => {
      const error = new Error("Database fail");
      mockGetUsers.mockRejectedValue(error);
      await UserAdminController.getAllUsers(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: updateUserRoles (IL TUO NUOVO TEST)
  // --------------------------------------------------------------------------
  describe("updateUserRoles", () => {
    it("should update roles and return 200 if input is valid", async () => {
      // Setup
      req.params.userId = "10";
      const validRolesInput = { roleIds: [1, 2] };
      // Simuliamo la risposta del service col nuovo formato array
      const updatedUser = { id: 10, roles: [{ id: 1 }, { id: 2 }] };

      // Configurazione Mock
      mockValidateUserRoleUpdateInput.mockReturnValue(validRolesInput);
      mockUpdateUserRoles.mockResolvedValue(updatedUser);

      // Esecuzione
      await UserAdminController.updateUserRoles(req, res, next);

      // Asserzioni
      expect(mockValidateUserRoleUpdateInput).toHaveBeenCalledWith(req);
      expect(mockUpdateUserRoles).toHaveBeenCalledWith(10, [1, 2]); // Verifica conversione ID in numero
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedUser);
    });

    it("should return 400 if userId is invalid (e.g. string)", async () => {
      req.params.userId = "abc";

      await UserAdminController.updateUserRoles(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "userId must be a positive integer.",
      });
      // Importante: verificare che il service NON venga chiamato
      expect(mockUpdateUserRoles).not.toHaveBeenCalled();
    });

    it("should return 400 if userId is negative", async () => {
        req.params.userId = "-5";
  
        await UserAdminController.updateUserRoles(req, res, next);
  
        expect(res.status).toHaveBeenCalledWith(400);
        expect(mockUpdateUserRoles).not.toHaveBeenCalled();
      });

    it("should call next(error) if service throws (e.g. Roles not found)", async () => {
      req.params.userId = "10";
      // Simuliamo input valido ma DB error
      mockValidateUserRoleUpdateInput.mockReturnValue({ roleIds: [999] });
      const error = new Error("Roles not found");
      mockUpdateUserRoles.mockRejectedValue(error);

      await UserAdminController.updateUserRoles(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: deleteUser (NUOVO)
  // --------------------------------------------------------------------------
  describe("deleteUser", () => {
    it("should delete user and return 204 if userId is valid", async () => {
      req.params.userId = "5";
      req.user = { id: 1 }; // Different user (admin deleting another user)
      mockDeleteUser.mockResolvedValue(true);

      await UserAdminController.deleteUser(req, res, next);

      expect(mockDeleteUser).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should return 400 if userId is invalid (non-numeric)", async () => {
      req.params.userId = "abc";
      req.user = { id: 1 };

      await UserAdminController.deleteUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "userId must be a positive integer.",
      });
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it("should return 400 if userId is negative", async () => {
      req.params.userId = "-5";
      req.user = { id: 1 };

      await UserAdminController.deleteUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it("should return 400 if userId is zero", async () => {
      req.params.userId = "0";
      req.user = { id: 1 };

      await UserAdminController.deleteUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it("should return 403 if user tries to delete their own account", async () => {
      req.params.userId = "10";
      req.user = { id: 10 }; // Same user ID

      await UserAdminController.deleteUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "You cannot delete your own account.",
      });
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it("should call next(error) if service throws (e.g. User not found)", async () => {
      req.params.userId = "999";
      req.user = { id: 1 };
      const error = new Error("User with ID 999 not found.");
      error.statusCode = 404;
      mockDeleteUser.mockRejectedValue(error);

      await UserAdminController.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should call next(error) if service throws (e.g. Cannot delete citizen)", async () => {
      req.params.userId = "2";
      req.user = { id: 1 };
      const error = new Error("Operation not allowed: You cannot delete a Citizen account.");
      error.statusCode = 403;
      mockDeleteUser.mockRejectedValue(error);

      await UserAdminController.deleteUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

});