import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// 1. Mock delle dipendenze
const mockCreateUser = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockFindUserByUsername = jest.fn();
const mockFindUserById = jest.fn();
const mockFindRoleByName = jest.fn(); 
const mockFindRoleById = jest.fn(); // Fondamentale per la logica ibrida

// Mock del repository User
jest.unstable_mockModule("../../../repositories/user-repo.mjs", () => ({
  createUser: mockCreateUser,
  findUserByEmail: mockFindUserByEmail,
  findUserByUsername: mockFindUserByUsername,
  findUserById: mockFindUserById,
}));

// Mock del repository Role
jest.unstable_mockModule("../../../repositories/role-repo.mjs", () => ({
  findRoleByName: mockFindRoleByName,
  findRoleById: mockFindRoleById, // Esportiamo anche questo
}));

// Mock di bcrypt
const mockHash = jest.fn();
const mockCompare = jest.fn();
jest.unstable_mockModule("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

// Mock di sanitizeUser
const mockSanitizeUser = jest.fn((user) => {
  const { hashedPassword, ...rest } = user;
  return rest;
});
jest.unstable_mockModule("../../../shared/utils/userUtils.mjs", () => ({
  sanitizeUser: mockSanitizeUser,
}));

// 2. Import dinamico
let AuthService;

describe("AuthService (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const authServiceModule = await import("../../../services/auth-service.mjs");
    AuthService = authServiceModule.AuthService;
  });

  const mockUserInput = {
    email: "test@example.com",
    username: "testuser",
    password: "password123",
    firstName: "Test",
    lastName: "User",
    // roleId di default è 1 nel servizio
  };

  const mockPlainUser = {
    id: 1,
    email: "test@example.com",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    hashedPassword: "hashed-password-123",
    roleId: 1,
  };

  const expectedSanitizedUser = {
    id: 1,
    email: "test@example.com",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    roleId: 1,
  };

  const mockSequelizeUser = {
    ...mockPlainUser,
    get: jest.fn().mockReturnValue(mockPlainUser),
  };

  describe("registerUser", () => {
    it("should register a new user successfully (looking up citizen role)", async () => {
      // Setup
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      
      // --- AGGIUNTA: Il mock DEVE restituire il ruolo citizen ---
      const mockCitizenRole = { id: 1, name: 'citizen' };
      mockFindRoleByName.mockResolvedValue(mockCitizenRole);
      // ----------------------------------------------------------
      
      mockHash.mockResolvedValue("hashed-password-123");
      mockCreateUser.mockResolvedValue(mockSequelizeUser);
      mockFindUserById.mockResolvedValue(mockSequelizeUser); 

      const result = await AuthService.registerUser(mockUserInput);

      expect(mockFindUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockFindUserByUsername).toHaveBeenCalledWith("testuser");
      
      // Verifica che il servizio abbia cercato il ruolo per nome
      expect(mockFindRoleByName).toHaveBeenCalledWith("citizen");
      
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: "test@example.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        hashedPassword: "hashed-password-123",
        roleId: 1, // Usa l'ID restituito dal mock
      });

      expect(result).toEqual(expectedSanitizedUser);
    });

    // TEST MANCANTE: Email Format
    it("should throw 400 if email format is invalid", async () => {
      const invalidInput = { ...mockUserInput, email: "invalid-email" };
      
      // Catturiamo l'errore sincrono
      try {
          await AuthService.registerUser(invalidInput);
      } catch (e) {
          expect(e.message).toBe("Invalid email format.");
          expect(e.statusCode).toBe(400);
      }
    });

    it("should throw 409 if email exists", async () => {
      // Passiamo il controllo email format
      mockFindUserByEmail.mockResolvedValue(mockSequelizeUser);
      
      await expect(AuthService.registerUser(mockUserInput)).rejects.toThrow("Email is already registered.");
    });

    it("should throw 409 if username exists", async () => {
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);
      
      await expect(AuthService.registerUser(mockUserInput)).rejects.toThrow("Username is already registered.");
    });

    it("should throw 500 if roleId is missing AND 'citizen' role is not found in DB", async () => {
      // Setup: Email/Username validi
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      
      // Setup CRUCIALE: Simuliamo che il DB non abbia il ruolo 'citizen'
      mockFindRoleByName.mockResolvedValue(null); 

      // Input senza roleId
      const inputNoRole = { ...mockUserInput };
      delete inputNoRole.roleId; 
      // Nota: assicurati che mockUserInput nel tuo file non abbia roleId, 
      // oppure usa delete come qui sopra.

      await expect(AuthService.registerUser(inputNoRole))
        .rejects.toMatchObject({ 
          message: "Default citizen role not found in database.", 
          statusCode: 500 
        });
        
      // Verifica che abbia provato a cercarlo
      expect(mockFindRoleByName).toHaveBeenCalledWith("citizen");
    });

    // Test per coprire il ramo FALSO di riga 39 (if !assignedRoleId)
    // Verifica che se passo un roleId, il codice SALTA la ricerca di 'citizen'
    it("should skip citizen lookup if roleId is provided explicitly", async () => {
      // Setup
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindRoleById.mockResolvedValue({ id: 5, name: 'custom_role' });
      mockHash.mockResolvedValue("hashed");
      mockCreateUser.mockResolvedValue(mockSequelizeUser);
      mockFindUserById.mockResolvedValue(mockSequelizeUser);

      // Input con un ruolo specifico (es. 5)
      const inputWithRole = { ...mockUserInput, roleId: 5 };

      await AuthService.registerUser(inputWithRole);

      // VERIFICA CHIAVE: findRoleByName NON deve essere chiamato
      expect(mockFindRoleByName).not.toHaveBeenCalled();
      // createUser deve essere stato chiamato con l'ID 5
      expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ roleId: 5 }));
    });

    // Test per coprire il ramo DESTRO di riga 61 (?? createdUser)
    // Verifica il fallback se la rilettura (hydration) ritorna null
    it("should fallback to createdUser if hydration (findUserById) returns null", async () => {
      // Setup standard
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindRoleByName.mockResolvedValue({ id: 1, name: 'citizen' });
      mockHash.mockResolvedValue("hashed");
      
      // Creazione ok
      mockCreateUser.mockResolvedValue(mockSequelizeUser);
      
      // SETUP CRUCIALE: La rilettura ritorna NULL
      mockFindUserById.mockResolvedValue(null); 

      const result = await AuthService.registerUser(mockUserInput);

      // Deve funzionare comunque usando l'oggetto creato inizialmente
      expect(result).toEqual(expectedSanitizedUser);
    });

    it("should throw 400 if provided roleId does not exist", async () => {
      // Setup: Email e Username sono validi (non devono fallire loro)
      mockFindUserByEmail.mockResolvedValue(null);
      mockFindUserByUsername.mockResolvedValue(null);

      // SETUP CRUCIALE: Simuliamo che findRoleById restituisca null (non trovato)
      mockFindRoleById.mockResolvedValue(null);

      // Input con un ID che non esiste
      const inputWithInvalidRole = { ...mockUserInput, roleId: 999 };

      // Esecuzione e Verifica
      await expect(AuthService.registerUser(inputWithInvalidRole))
        .rejects.toMatchObject({
          message: 'Role with name "999" not found.',
          statusCode: 400
        });

      // Verifichiamo che abbia provato a cercare quell'ID
      expect(mockFindRoleById).toHaveBeenCalledWith(999);
    });
  });

  describe("validateCredentials", () => {
    it("should return sanitized user on success", async () => {
      mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);
      mockCompare.mockResolvedValue(true);

      const result = await AuthService.validateCredentials("testuser", "password123");

      expect(mockFindUserByUsername).toHaveBeenCalledWith("testuser");
      expect(mockCompare).toHaveBeenCalledWith("password123", "hashed-password-123");
      expect(result).toEqual(expectedSanitizedUser);
    });

    // TEST MANCANTE: Login via Email
    it("should login successfully with email instead of username", async () => {
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindUserByEmail.mockResolvedValue(mockSequelizeUser);
      mockCompare.mockResolvedValue(true);

      const result = await AuthService.validateCredentials("test@example.com", "password");

      expect(mockFindUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(result).toEqual(expectedSanitizedUser);
    });

    it("should return null if user not found", async () => {
      mockFindUserByUsername.mockResolvedValue(null);
      mockFindUserByEmail.mockResolvedValue(null);
      const result = await AuthService.validateCredentials("wrong", "pass");
      expect(result).toBeNull();
    });

    it("should return null if password mismatch", async () => {
      mockFindUserByUsername.mockResolvedValue(mockSequelizeUser);
      mockCompare.mockResolvedValue(false); 
      
      const result = await AuthService.validateCredentials("testuser", "wrong");
      expect(result).toBeNull();
    });

    it("should correctly sanitize a plain object user (without .get method)", async () => {
      // Setup: Il repo restituisce un oggetto semplice COMPLETO
      const plainUserFromDb = { 
        id: 1, 
        email: "test@example.com", // <-- Aggiunto
        username: "testuser", 
        firstName: "Test",         // <-- Aggiunto
        lastName: "User",          // <-- Aggiunto
        roleId: 1,                 // <-- Aggiunto
        hashedPassword: "hashed-password-123",
        // Niente metodo .get() qui!
      };

      mockFindUserByUsername.mockResolvedValue(plainUserFromDb);
      mockCompare.mockResolvedValue(true);

      const result = await AuthService.validateCredentials("testuser", "password123");

      expect(result).toEqual(expectedSanitizedUser);
    });
  });

  // TEST MANCANTE: findUserById
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
  });
});