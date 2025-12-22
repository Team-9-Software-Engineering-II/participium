import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- 1. SETUP MOCKS ---

const mockRegisterUser = jest.fn(); // Fix: Assicurati che questo esista
const mockRegisterUserRequest = jest.fn();
const mockVerifyAndCreateUser = jest.fn();
const mockLogin = jest.fn();
const mockLogout = jest.fn();

const mockValidateRegistrationInput = jest.fn();
const mockPassportAuthenticate = jest.fn();

// Mock AuthService
jest.unstable_mockModule("../../../services/auth-service.mjs", () => ({
  AuthService: { 
    registerUser: mockRegisterUser, // Fix: Esportalo esplicitamente
    registerUserRequest: mockRegisterUserRequest,
    verifyAndCreateUser: mockVerifyAndCreateUser,
    login: mockLogin,
    logout: mockLogout
  },
}));

// Mock Validator
jest.unstable_mockModule("../../../shared/validators/user-registration-validator.mjs", () => ({
  validateRegistrationInput: mockValidateRegistrationInput,
}));

// Mock Passport Service
jest.unstable_mockModule("../../../services/passport-service.mjs", () => ({
  passport: { authenticate: mockPassportAuthenticate },
}));

// Helper per mockare la risposta Express
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// --- 2. TEST SUITE ---
describe("Auth Controller (Unit)", () => {
  let AuthController;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    AuthController = await import("../../../controllers/auth-controller.js");

    mockReq = {
      body: {},
      params: {},
      user: null,
      sessionID: "sess_123",
      session: { 
        save: jest.fn((cb) => cb && cb()),
        destroy: jest.fn((cb) => cb && cb(null)), // Fix: Mock destroy come funzione
        cookie: { expires: new Date() }
      },
      login: jest.fn((user, cb) => cb(null)), 
      logout: jest.fn((cb) => cb(null)),
      isAuthenticated: jest.fn().mockReturnValue(false) // Fix: Inizializzato come jest.fn()
    };
    mockRes = createMockResponse();
    mockNext = jest.fn();
  });

  // ==========================================================================
  // NUOVE FUNZIONI (Redis Flow)
  // ==========================================================================

  describe("registerRequest", () => {
    it("should register request successfully and return 200", async () => {
      const validatedData = { email: "test@test.com", password: "pwd" };
      const mockResult = { message: "Confirmation code sent" };

      mockValidateRegistrationInput.mockReturnValue(validatedData);
      mockRegisterUserRequest.mockResolvedValue(mockResult);

      await AuthController.registerRequest(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it("should stop if validation fails", async () => {
      mockValidateRegistrationInput.mockReturnValue(null);
      await AuthController.registerRequest(mockReq, mockRes, mockNext);
      expect(mockRegisterUserRequest).not.toHaveBeenCalled();
    });

    it("should call next(error) if service throws", async () => {
      mockValidateRegistrationInput.mockReturnValue({ email: "v" });
      const error = new Error("Err");
      mockRegisterUserRequest.mockRejectedValue(error);
      await AuthController.registerRequest(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("verifyRegistration", () => {
    it("should verify user, login, and return response", async () => {
      mockReq.body = { email: "test@test.com", confirmationCode: "123" };
      mockVerifyAndCreateUser.mockResolvedValue({ id: 1 });

      await AuthController.verifyRegistration(mockReq, mockRes, mockNext);

      expect(mockVerifyAndCreateUser).toHaveBeenCalled();
      expect(mockReq.login).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled(); 
    });

    it("should return 400 if fields are missing", async () => {
      mockReq.body = { email: "test@test.com" };
      await AuthController.verifyRegistration(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("should call next(error) if login fails", async () => {
      mockReq.body = { email: "a", confirmationCode: "b" };
      mockVerifyAndCreateUser.mockResolvedValue({ id: 1 });
      const loginError = new Error("Login fail");
      mockReq.login = jest.fn((user, cb) => cb(loginError));

      await AuthController.verifyRegistration(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(loginError);
    });

    it("should call next(error) if service throws", async () => {
      mockReq.body = { email: "a", confirmationCode: "b" };
      mockVerifyAndCreateUser.mockRejectedValue(new Error("Err"));
      await AuthController.verifyRegistration(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle undefined req.body (Line 135 coverage)", async () => {
      mockReq.body = undefined; // Simuliamo body undefined

      await AuthController.verifyRegistration(mockReq, mockRes, mockNext);

      // Deve fallire con 400 perché mancano email/code, ma non deve crashare
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining("Missing required fields")
      }));
    });
  });

  // ==========================================================================
  // VECCHIE FUNZIONI (Standard Flow)
  // ==========================================================================

  describe("register", () => {
    it("should register user, login and return session response", async () => {
      const validatedData = { email: "reg@test.com" };
      const createdUser = { id: 1, email: "reg@test.com" };

      mockValidateRegistrationInput.mockReturnValue(validatedData);
      mockRegisterUser.mockResolvedValue(createdUser);

      await AuthController.register(mockReq, mockRes, mockNext);

      expect(mockValidateRegistrationInput).toHaveBeenCalled();
      expect(mockRegisterUser).toHaveBeenCalledWith(validatedData);
      expect(mockReq.login).toHaveBeenCalled();
      // sendSessionResponse usa 201 per register
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it("should return if validation fails", async () => {
      mockValidateRegistrationInput.mockReturnValue(null);
      await AuthController.register(mockReq, mockRes, mockNext);
      expect(mockRegisterUser).not.toHaveBeenCalled();
    });

    it("should call next(error) if login fails", async () => {
      mockValidateRegistrationInput.mockReturnValue({});
      mockRegisterUser.mockResolvedValue({});
      const loginError = new Error("Login Fail");
      mockReq.login = jest.fn((u, cb) => cb(loginError));

      await AuthController.register(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(loginError);
    });

    it("should call next(error) if service throws", async () => {
      mockValidateRegistrationInput.mockReturnValue({});
      const error = new Error("Service Fail");
      mockRegisterUser.mockRejectedValue(error);

      await AuthController.register(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("login", () => {
    it("should authenticate successfully and return session response", () => {
      const mockUser = { id: 1 };
      
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(null, mockUser, null);
        };
      });

      AuthController.login(mockReq, mockRes, mockNext);

      expect(mockPassportAuthenticate).toHaveBeenCalledWith("local", expect.any(Function));
      expect(mockReq.login).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200); 
      expect(mockRes.json).toHaveBeenCalled();
    });

    it("should return 401 if authentication fails", () => {
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(null, false, { message: "Bad creds" });
        };
      });

      AuthController.login(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Bad creds" });
    });

    it("should call next(error) if passport errors", () => {
      const error = new Error("Passport error");
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(error, null, null);
        };
      });

      AuthController.login(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should call next(error) if req.login errors", () => {
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(null, { id: 1 }, null);
        };
      });

      const loginError = new Error("Session error");
      mockReq.login = jest.fn((u, cb) => cb(loginError));

      AuthController.login(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(loginError);
    });

    it("should use default error message if info is missing (Line 60 coverage)", () => {
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          // Callback con user=false e info=undefined
          callback(null, false, undefined); 
        };
      });

      AuthController.login(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      // Verifica che usi il messaggio di default
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Invalid credentials." });
    });
  });

  describe("currentSession", () => {
    it("should return authenticated: false if not logged in", () => {
      mockReq.isAuthenticated.mockReturnValue(false); // Ora funziona perché è jest.fn()

      AuthController.currentSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ authenticated: false });
    });

    it("should return session data if logged in", () => {
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { id: 1, email: "me@test.com" };

      AuthController.currentSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        authenticated: true,
        user: mockReq.user
      }));
    });

    it("should handle missing session cookie data (Line 18 coverage)", () => {
      mockReq.isAuthenticated.mockReturnValue(true);
      mockReq.user = { id: 1 };
      // Rimuoviamo l'oggetto cookie dalla sessione per forzare il null coalescing
      delete mockReq.session.cookie; 

      AuthController.currentSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        session: expect.objectContaining({
          cookie: { expiresAt: null } // Verifica che sia null
        })
      }));
    });
  });

  describe("logout", () => {
    it("should logout, destroy session, clear cookie and return 204", () => {
      AuthController.logout(mockReq, mockRes, mockNext);

      expect(mockReq.logout).toHaveBeenCalled();
      expect(mockReq.session.destroy).toHaveBeenCalled(); // Ora funziona
      expect(mockRes.clearCookie).toHaveBeenCalledWith("connect.sid");
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it("should handle missing session object gracefully", () => {
      mockReq.session = null; 

      AuthController.logout(mockReq, mockRes, mockNext);

      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it("should call next(error) if logout fails", () => {
      const error = new Error("Logout fail");
      mockReq.logout = jest.fn((cb) => cb(error));

      AuthController.logout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it("should call next(error) if session destroy fails", () => {
      const error = new Error("Destroy fail");
      mockReq.session.destroy = jest.fn((cb) => cb(error));

      AuthController.logout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});