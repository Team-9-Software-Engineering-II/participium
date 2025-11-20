import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// --- 1. SETUP MOCKS ---

const mockRegisterUser = jest.fn();
const mockValidateRegistrationInput = jest.fn();
const mockPassportAuthenticate = jest.fn();

// Mock AuthService
jest.unstable_mockModule("../../../services/auth-service.mjs", () => ({
  AuthService: { registerUser: mockRegisterUser },
}));

// Mock Validator (ATTENZIONE: Uso il percorso che vedo nel tuo codice sorgente)
jest.unstable_mockModule("../../../shared/validators/user-registration-validator.mjs", () => ({
  validateRegistrationInput: mockValidateRegistrationInput,
}));

// Mock Passport Service
jest.unstable_mockModule("../../../services/passport-service.mjs", () => ({
  passport: { authenticate: mockPassportAuthenticate },
}));

// --- 2. TEST SUITE ---

let AuthController;

describe("Auth Controller (Unit)", () => {
  beforeAll(async () => {
    // Import dinamico del controller dopo aver definito i mock
    AuthController = await import("../../../controllers/auth-controller.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper per creare mock di req e res
  const mockReqRes = () => {
    const req = {
      body: {},
      params: {},
      login: jest.fn((user, cb) => cb(null)), // Default: login success
      logout: jest.fn((cb) => cb(null)),     // Default: logout success
      isAuthenticated: jest.fn(),
      sessionID: "sess-123",
      session: {
        cookie: { expires: new Date() },
        destroy: jest.fn((cb) => cb(null)), // Default: destroy success
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      clearCookie: jest.fn(),
    };
    const next = jest.fn();
    return { req, res, next };
  };

  // --------------------------------------------------------------------------
  // TEST: register
  // --------------------------------------------------------------------------
  describe("register", () => {
    it("should register user, login, and return 201 on success", async () => {
      const { req, res, next } = mockReqRes();
      const mockUser = { id: 1, email: "test@test.com" };
      
      mockValidateRegistrationInput.mockReturnValue({ email: "test@test.com" });
      mockRegisterUser.mockResolvedValue(mockUser);

      await AuthController.register(req, res, next);

      expect(mockValidateRegistrationInput).toHaveBeenCalledWith(req, res);
      expect(mockRegisterUser).toHaveBeenCalled();
      expect(req.login).toHaveBeenCalledWith(mockUser, expect.any(Function));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        authenticated: true,
        user: mockUser
      }));
    });

    it("should return immediately if validation fails", async () => {
      const { req, res, next } = mockReqRes();
      mockValidateRegistrationInput.mockReturnValue(null); // Validazione fallita

      await AuthController.register(req, res, next);

      expect(mockValidateRegistrationInput).toHaveBeenCalled();
      expect(mockRegisterUser).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Il validatore gestisce la risposta
    });

    it("should call next(error) if login fails after registration", async () => {
      const { req, res, next } = mockReqRes();
      const loginError = new Error("Login failed");
      req.login = jest.fn((u, cb) => cb(loginError)); // Login fallisce

      mockValidateRegistrationInput.mockReturnValue({ email: "test" });
      mockRegisterUser.mockResolvedValue({ id: 1 });

      await AuthController.register(req, res, next);

      expect(req.login).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(loginError);
    });

    it("should call next(error) if service throws", async () => {
      const { req, res, next } = mockReqRes();
      const error = new Error("Service error");
      mockValidateRegistrationInput.mockReturnValue({ email: "test" });
      mockRegisterUser.mockRejectedValue(error);

      await AuthController.register(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: login
  // --------------------------------------------------------------------------
  describe("login", () => {
    it("should return 200 and session info on successful login", () => {
      const { req, res, next } = mockReqRes();
      const mockUser = { id: 1, username: "user" };

      // Simuliamo passport.authenticate che chiama la callback con successo
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(null, mockUser, null); // err, user, info
        };
      });

      AuthController.login(req, res, next);

      expect(req.login).toHaveBeenCalledWith(mockUser, expect.any(Function));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ authenticated: true }));
    });

    it("should return 401 if user is not found/invalid creds", () => {
      const { req, res, next } = mockReqRes();
      
      // Simuliamo passport che non trova l'utente
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(null, false, { message: "Bad creds" }); // user is false
        };
      });

      AuthController.login(req, res, next);

      expect(req.login).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Bad creds" });
    });

    it("should call next(err) if passport strategy errors", () => {
      const { req, res, next } = mockReqRes();
      const error = new Error("Passport Strategy Error");

      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          callback(error, null, null);
        };
      });

      AuthController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should call next(error) if req.login fails", () => {
      const { req, res, next } = mockReqRes();
      const mockUser = { id: 1 };
      const error = new Error("Session save failed");
      
      req.login = jest.fn((u, cb) => cb(error)); // Login fallisce

      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => callback(null, mockUser, null);
      });

      AuthController.login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should return default error message if passport info is missing", () => {
      const { req, res, next } = mockReqRes();

      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req, res, next) => {
          // Simuliamo fallimento login SENZA oggetto info (terzo argomento null)
          callback(null, false, null); 
        };
      });

      AuthController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      // Verifichiamo che usi il messaggio di default
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials." });
    });
  });

  // --------------------------------------------------------------------------
  // TEST: currentSession
  // --------------------------------------------------------------------------
  describe("currentSession", () => {
    it("should return 200 and user if authenticated", () => {
      const { req, res } = mockReqRes();
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 1, username: "logged" };

      AuthController.currentSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        authenticated: true,
        user: req.user
      }));
    });

    it("should return authenticated: false if not authenticated", () => {
      const { req, res } = mockReqRes();
      req.isAuthenticated.mockReturnValue(false);

      AuthController.currentSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ authenticated: false });
    });

    it("should return null for expiresAt if cookie expiration is missing", () => {
      const { req, res } = mockReqRes();
      req.isAuthenticated.mockReturnValue(true);
      req.user = { id: 1 };
      
      // Simuliamo una sessione senza data di scadenza
      req.session.cookie = {}; 

      AuthController.currentSession(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // Verifichiamo che il fallback 'null' sia stato usato
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        session: expect.objectContaining({
          cookie: { expiresAt: null }
        })
      }));
    });
  });

  // --------------------------------------------------------------------------
  // TEST: logout
  // --------------------------------------------------------------------------
  describe("logout", () => {
    it("should logout, destroy session, clear cookie and send 204", () => {
      const { req, res, next } = mockReqRes();

      AuthController.logout(req, res, next);

      expect(req.logout).toHaveBeenCalled();
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("should call next(error) if logout fails", () => {
      const { req, res, next } = mockReqRes();
      const error = new Error("Logout fail");
      req.logout = jest.fn((cb) => cb(error));

      AuthController.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should call next(error) if session destroy fails", () => {
      const { req, res, next } = mockReqRes();
      const error = new Error("Destroy fail");
      req.session.destroy = jest.fn((cb) => cb(error));

      AuthController.logout(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("should clear cookie and send 204 even if req.session is missing", () => {
      const { req, res, next } = mockReqRes();
      
      // IL PUNTO CHIAVE: Simuliamo che non ci sia l'oggetto sessione
      req.session = null; 

      AuthController.logout(req, res, next);

      expect(req.logout).toHaveBeenCalled();
      // Verifichiamo che, anche senza sessione da distruggere, pulisca comunque i cookie
      expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});