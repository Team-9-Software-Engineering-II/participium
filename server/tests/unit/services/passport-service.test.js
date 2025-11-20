import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";

// --- 1. MOCK DELLE DIPENDENZE ---

const mockValidateCredentials = jest.fn();
const mockFindUserById = jest.fn();

jest.unstable_mockModule("../../../services/auth-service.mjs", () => ({
  AuthService: {
    validateCredentials: mockValidateCredentials,
    findUserById: mockFindUserById,
  },
}));

const mockUse = jest.fn();
const mockSerializeUser = jest.fn();
const mockDeserializeUser = jest.fn();

jest.unstable_mockModule("passport", () => ({
  default: {
    use: mockUse,
    serializeUser: mockSerializeUser,
    deserializeUser: mockDeserializeUser,
  },
}));

const MockStrategy = jest.fn();

jest.unstable_mockModule("passport-local", () => ({
  Strategy: MockStrategy,
}));

// --- 2. TEST SUITE ---

describe("Passport Service (Unit)", () => {
  let verifyCallback;
  let serializeCallback;
  let deserializeCallback;

  beforeAll(async () => {
    // Importando il file, il codice 'configurePassport()' viene eseguito immediatamente
    await import("../../../services/passport-service.mjs");

    // Catturiamo le callback
    verifyCallback = MockStrategy.mock.calls[0][1];
    serializeCallback = mockSerializeUser.mock.calls[0][0];
    deserializeCallback = mockDeserializeUser.mock.calls[0][0];
  });

  // RIMOSSO: beforeEach(() => { jest.clearAllMocks(); });
  // Lo togliamo da qui perché cancellerebbe la prova che 'passport.use' è stato chiamato all'import.

  // --------------------------------------------------------------------------
  // TEST CONFIGURAZIONE INIZIALE (Questo deve girare coi mock "sporchi" dell'import)
  // --------------------------------------------------------------------------
  it("should configure passport strategies on import", () => {
    expect(mockUse).toHaveBeenCalled();
    expect(MockStrategy).toHaveBeenCalledWith(
      {
        usernameField: "username",
        passwordField: "password",
        session: true,
      },
      expect.any(Function)
    );
    expect(mockSerializeUser).toHaveBeenCalled();
    expect(mockDeserializeUser).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // TEST STRATEGIA LOCALE (Verify Callback)
  // --------------------------------------------------------------------------
  describe("Local Strategy Verification", () => {
    // AGGIUNTO QUI: Puliamo i mock prima di ogni test logico
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should call done(null, user) if credentials are valid", async () => {
      const mockUser = { id: 1, username: "test" };
      mockValidateCredentials.mockResolvedValue(mockUser);
      const done = jest.fn();

      await verifyCallback("test", "password", done);

      expect(mockValidateCredentials).toHaveBeenCalledWith("test", "password");
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it("should call done(null, false, message) if credentials are invalid", async () => {
      mockValidateCredentials.mockResolvedValue(null);
      const done = jest.fn();

      await verifyCallback("test", "wrong", done);

      expect(done).toHaveBeenCalledWith(null, false, { message: "Invalid credentials." });
    });

    it("should call done(err) if validation throws error", async () => {
      const error = new Error("DB Error");
      mockValidateCredentials.mockRejectedValue(error);
      const done = jest.fn();

      await verifyCallback("test", "password", done);

      expect(done).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST SERIALIZZAZIONE
  // --------------------------------------------------------------------------
  describe("Serialization", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should serialize user id", () => {
      const user = { id: 123 };
      const done = jest.fn();

      serializeCallback(user, done);

      expect(done).toHaveBeenCalledWith(null, 123);
    });
  });

  // --------------------------------------------------------------------------
  // TEST DESERIALIZZAZIONE
  // --------------------------------------------------------------------------
  describe("Deserialization", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should deserialize user if found", async () => {
      const user = { id: 123, username: "test" };
      mockFindUserById.mockResolvedValue(user);
      const done = jest.fn();

      await deserializeCallback(123, done);

      expect(mockFindUserById).toHaveBeenCalledWith(123);
      expect(done).toHaveBeenCalledWith(null, user);
    });

    it("should call done(err) if findUserById throws", async () => {
      const error = new Error("DB Error");
      mockFindUserById.mockRejectedValue(error);
      const done = jest.fn();

      await deserializeCallback(123, done);

      expect(done).toHaveBeenCalledWith(error);
    });
  });
});