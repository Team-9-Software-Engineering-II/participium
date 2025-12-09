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

// NUOVO MOCK: Redis Repo
const mockSaveTemporaryUser = jest.fn();
const mockGetTemporaryUser = jest.fn();
const mockDeleteTemporaryUser = jest.fn();

jest.unstable_mockModule("../../../repositories/redis-repo.mjs", () => ({
  saveTemporaryUser: mockSaveTemporaryUser,
  getTemporaryUser: mockGetTemporaryUser,
  deleteTemporaryUser: mockDeleteTemporaryUser,
}));

// NUOVO MOCK: Email Service
const mockSendVerificationCode = jest.fn();

// Assumiamo che il service importi EmailService. Adattiamo il mock per coprire export default o named.
jest.unstable_mockModule("../../../services/email-service.mjs", () => ({
  default: { sendVerificationCode: mockSendVerificationCode },
  EmailService: { sendVerificationCode: mockSendVerificationCode }
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

    it("should throw 400 if email format is invalid", async () => {
      const invalidInput = { ...mockUserInput, email: "invalid-email-string" };

      await expect(AuthService.registerUser(invalidInput))
        .rejects.toMatchObject({ 
          message: "Invalid email format.", 
          statusCode: 400 
        });
    });

    it("should throw 409 if username is already registered", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      
      mockFindUserByUsername.mockResolvedValue({ id: 5 }); 

      await expect(AuthService.registerUser(mockUserInput))
        .rejects.toMatchObject({
          message: "Username is already registered.",
          statusCode: 409
        });
        
      expect(mockFindUserByUsername).toHaveBeenCalledWith(mockUserInput.username);
    });

    it("should fallback to createdUser if hydration (findUserById) fails", async () => {
      // Setup standard per successo
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindRoleByName.mockResolvedValue({ id: 1 }); // Ruolo citizen esiste
      mockHash.mockResolvedValue("hashed");
      
      // Creazione OK
      mockCreateUser.mockResolvedValue(mockSequelizeUser);
      
      // MA... la rilettura fallisce (ritorna null)
      mockFindUserById.mockResolvedValue(null); 

      const result = await AuthService.registerUser(mockUserInput);

      // Verifica che restituisca comunque l'utente (usando createdUser)
      expect(result).toEqual(expectedSanitizedUser);
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
      mockFindRoleById.mockResolvedValue(null);

      await expect(AuthService.registerMunicipalOrStaffUser(mockStaffInput))
        .rejects.toThrow("Role with id 4 not found");
    });
    
    it("should throw 409 if email exists", async () => {
       mockFindUserByEmail.mockResolvedValue({});
       await expect(AuthService.registerMunicipalOrStaffUser(mockStaffInput))
         .rejects.toHaveProperty("statusCode", 409);
    });

    it("should fallback to createdUser if hydration fails", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindTechnicalOfficeById.mockResolvedValue({ id: 1 });
      mockFindRoleById.mockResolvedValue({ id: 4 });
      mockHash.mockResolvedValue("hashed");
      
      const staffPlain = { ...mockPlainUser, roleId: 4, technicalOfficeId: 1 };
      const staffUser = { 
          ...mockSequelizeUser, 
          ...staffPlain,
          get: jest.fn().mockReturnValue(staffPlain)
      };

      mockCreateUser.mockResolvedValue(staffUser);

      mockFindUserById.mockResolvedValue(null);

      const result = await AuthService.registerMunicipalOrStaffUser(mockStaffInput);

      expect(result.roleId).toBe(4);
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
    
    it("should return null if user is not found by username OR email", async () => {
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindUserByEmail.mockResolvedValue(null);

      const result = await AuthService.validateCredentials("wrong", "pass");
      
      expect(result).toBeNull();
    });

    it("should return null if password mismatch", async () => {
      mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);
      // Fondamentale: bcrypt dice che la password è SBAGLIATA
      mockCompare.mockResolvedValue(false); 

      const result = await AuthService.validateCredentials("testuser", "wrong");

      expect(mockCompare).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should correctly sanitize a plain object user (branch coverage for no .get method)", async () => {
      const plainUser = { 
        id: 1, 
        username: "test", 
        email: "test@test.com",
        firstName: "T",
        lastName: "U",
        roleId: 1,
        hashedPassword: "hashed-password-123" 
      };

      mockFindUserByUsername.mockResolvedValue(plainUser);
      mockCompare.mockResolvedValue(true);

      const result = await AuthService.validateCredentials("test", "pass");

      expect(result.hashedPassword).toBeUndefined();
      expect(result.username).toBe("test");
    });
  });

  // --------------------------------------------------------------------------
  // findUserById
  // --------------------------------------------------------------------------
  describe("findUserById", () => {

    it("should return sanitized user if found", async () => {
      mockFindUserById.mockResolvedValue(mockSequelizeUser);
      const result = await AuthService.findUserById(1);
      expect(mockFindUserById).toHaveBeenCalledWith(1);
      expect(result).toEqual(expectedSanitizedUser);
    });

    it("should return null if user is not found", async () => {
      mockFindUserById.mockResolvedValue(null);
      const result = await AuthService.findUserById(999);
      expect(mockFindUserById).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("should sanitize user including nested role object", async () => {
      const userWithRole = {
        ...mockPlainUser,
        role: { id: 1, name: "citizen", description: "ignore me" }
      };
      
      const mockUserInstance = {
        ...userWithRole,
        get: jest.fn().mockReturnValue(userWithRole)
      };

      mockFindUserById.mockResolvedValue(mockUserInstance);

      const result = await AuthService.findUserById(1);

      expect(result.hashedPassword).toBeUndefined();
      expect(result.role).toEqual({ id: 1, name: "citizen" });
    });
  });

  // ==========================================================================
  // registerUserRequest (NUOVO - Redis Flow Step 1)
  // ==========================================================================
  describe("registerUserRequest", () => {
    const redisInput = {
      firstName: "Mario",
      lastName: "Rossi",
      email: "new@test.com",
      username: "mario123",
      password: "password123"
    };

    it("should process request, save to Redis and send email", async () => {
      // 1. Nessun conflitto nel DB
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      
      // 2. Redis salva ok
      mockSaveTemporaryUser.mockResolvedValue();

      // 3. Email inviata ok
      mockSendVerificationCode.mockResolvedValue({ previewUrl: "http://fake.url" });

      const result = await AuthService.registerUserRequest(redisInput);

      // Verifiche
      expect(mockFindUserByEmail).toHaveBeenCalledWith(redisInput.email);
      expect(mockSaveTemporaryUser).toHaveBeenCalledWith(
        redisInput.email,
        expect.objectContaining({ email: redisInput.email }),
        expect.stringMatching(/^\d{6}$/) // Regex: codice a 6 cifre
      );
      expect(mockSendVerificationCode).toHaveBeenCalled();
      
      expect(result).toEqual(expect.objectContaining({
        message: expect.stringContaining("successfully"),
        confirmationCode: expect.any(String)
      }));
    });

    it("should throw 409 if email already exists", async () => {
      mockFindUserByEmail.mockResolvedValue({ id: 1 }); // Esiste
      await expect(AuthService.registerUserRequest(redisInput))
        .rejects.toHaveProperty("statusCode", 409);
      expect(mockSaveTemporaryUser).not.toHaveBeenCalled();
    });

    it("should throw 409 if username already exists", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue({ id: 1 }); // Esiste
      await expect(AuthService.registerUserRequest(redisInput))
        .rejects.toHaveProperty("statusCode", 409);
      expect(mockSaveTemporaryUser).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // verifyAndCreateUser (NUOVO - Redis Flow Step 2)
  // ==========================================================================
  describe("verifyAndCreateUser", () => {
    const email = "test@test.com";
    const code = "123456";
    const redisData = { 
      firstName: "Mario", 
      lastName: "Rossi", 
      email: email, 
      username: "mario123", 
      password: "rawPassword", 
      verificationCode: code 
    };

    it("should verify code, create user and delete temp data", async () => {
      // 1. Redis trova i dati
      mockGetTemporaryUser.mockResolvedValue(redisData);

      // 2. Race condition check: email/username ancora liberi
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);

      // 3. Ruolo
      mockFindRoleByName.mockResolvedValue({ id: 2, name: "citizen" });
      
      // 4. Hashing password
      mockHash.mockResolvedValue("hashed_secret");

      // 5. Creazione DB
      const createdUser = { id: 10, email, roleId: 2, ...redisData };
      mockCreateUser.mockResolvedValue(createdUser);
      // Hydration
      mockFindUserById.mockResolvedValue({ ...createdUser, get: jest.fn().mockReturnValue(createdUser) });

      const result = await AuthService.verifyAndCreateUser(email, code);

      expect(mockGetTemporaryUser).toHaveBeenCalledWith(email);
      
      // --- FIX QUI SOTTO ---
      // Accettiamo "rawPassword" seguito da qualsiasi numero (es. 10)
      expect(mockHash).toHaveBeenCalledWith("rawPassword", expect.any(Number));
      // ---------------------

      expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({
        email: email,
        hashedPassword: "hashed_secret",
        roleId: 2
      }));

      expect(mockDeleteTemporaryUser).toHaveBeenCalledWith(email);
      
      // Verifica sanitizzazione (no password)
      expect(result.hashedPassword).toBeUndefined();
      expect(result.email).toBe(email);
    });

    it("should throw 404 if Redis data is missing/expired", async () => {
      mockGetTemporaryUser.mockResolvedValue(null);
      await expect(AuthService.verifyAndCreateUser(email, code))
        .rejects.toHaveProperty("statusCode", 404);
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("should throw 400 if code does not match", async () => {
      mockGetTemporaryUser.mockResolvedValue({ ...redisData, verificationCode: "999999" });
      await expect(AuthService.verifyAndCreateUser(email, "123456"))
        .rejects.toHaveProperty("statusCode", 400);
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("should fallback to createdUser if hydration (findUserById) fails (Line 327 coverage)", async () => {
      // Setup standard per successo
      mockGetTemporaryUser.mockResolvedValue(redisData);
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindRoleByName.mockResolvedValue({ id: 2 });
      mockHash.mockResolvedValue("hashed");

      // 1. La creazione va a buon fine
      const createdUser = { id: 10, email, roleId: 2, ...redisData };
      mockCreateUser.mockResolvedValue(createdUser);

      // 2. MA... la rilettura (hydration) fallisce (ritorna null)
      mockFindUserById.mockResolvedValue(null);

      const result = await AuthService.verifyAndCreateUser(email, code);

      // Verifiche
      // Deve aver usato 'createdUser' invece di crashare o tornare null
      expect(result.email).toBe(email);
      expect(result.id).toBe(10);
      // Verifica che sia stato comunque sanitizzato (niente password)
      expect(result.hashedPassword).toBeUndefined();
    });
  });

});