import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// --- 1. SETUP MOCKS ---

// Mock del Service
const mockUpdateProfile = jest.fn();
jest.unstable_mockModule("../../../services/user-service.mjs", () => ({
  UserService: { updateProfile: mockUpdateProfile },
}));

// Mock delle Utility (sanitizeUser)
const mockSanitizeUser = jest.fn();
jest.unstable_mockModule("../../../shared/utils/userUtils.mjs", () => ({
  sanitizeUser: mockSanitizeUser,
}));

// Mock del Validatore
const mockValidateProfileUpdateInput = jest.fn();
jest.unstable_mockModule("../../../shared/validators/user-profile-update-validator.mjs", () => ({
  validateProfileUpdateInput: mockValidateProfileUpdateInput,
}));

// --- 2. TEST SUITE ---

let UserController;

describe("User Controller (Unit)", () => {
  beforeAll(async () => {
    // Import dinamico del controller dopo i mock
    UserController = await import("../../../controllers/user-controller.js");
  });

  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset oggetti req/res base
    req = {
      user: { id: 1, username: "testuser", email: "test@test.com" },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  // --------------------------------------------------------------------------
  // TEST: getProfile
  // --------------------------------------------------------------------------
  describe("getProfile", () => {
    it("should return sanitized user profile with 200 OK", async () => {
      const sanitizedUser = { id: 1, username: "testuser" }; // Senza password
      mockSanitizeUser.mockReturnValue(sanitizedUser);

      await UserController.getProfile(req, res, next);

      expect(mockSanitizeUser).toHaveBeenCalledWith(req.user);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(sanitizedUser);
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next(error) if an error occurs", async () => {
      const error = new Error("Unexpected error");
      mockSanitizeUser.mockImplementation(() => { throw error; });

      await UserController.getProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: updateProfile
  // --------------------------------------------------------------------------
  describe("updateProfile", () => {
    const validUpdates = { photoUrl: "http://new.jpg" };
    const updatedUser = { id: 1, photoURL: "http://new.jpg" };

    it("should update profile and return 200 OK on success", async () => {
      // Setup: Validazione OK, Service OK
      mockValidateProfileUpdateInput.mockReturnValue(validUpdates);
      mockUpdateProfile.mockResolvedValue(updatedUser);

      await UserController.updateProfile(req, res, next);

      // Verifica interazioni
      expect(mockValidateProfileUpdateInput).toHaveBeenCalledWith(req, res);
      // Verifica che chiami il SERVIZIO, non il modello direttamente
      expect(mockUpdateProfile).toHaveBeenCalledWith(req.user.id, validUpdates);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedUser);
    });

    it("should stop if validation fails (returns null)", async () => {
      // Setup: Validazione fallisce (restituisce null e gestisce la risposta internamente)
      mockValidateProfileUpdateInput.mockReturnValue(null);

      await UserController.updateProfile(req, res, next);

      expect(mockValidateProfileUpdateInput).toHaveBeenCalled();
      expect(mockUpdateProfile).not.toHaveBeenCalled(); // Il servizio NON deve partire
      expect(res.status).not.toHaveBeenCalled(); // La risposta l'ha già data il validatore
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next(error) if service throws", async () => {
      // Setup: Validazione OK, ma il Service esplode
      const error = new Error("DB Update failed");
      mockValidateProfileUpdateInput.mockReturnValue(validUpdates);
      mockUpdateProfile.mockRejectedValue(error);

      await UserController.updateProfile(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});