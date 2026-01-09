import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- 1. SETUP MOCKS ---

// Creiamo le funzioni mock per i metodi di Redis
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();

// Mockiamo il modulo di configurazione che esporta il client Redis
jest.unstable_mockModule("../../../config/redis.mjs", () => ({
  default: {
    set: mockSet,
    get: mockGet,
    del: mockDel,
  },
}));

// --- 2. TEST SUITE ---

let RedisRepo;

describe("Redis Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import dinamico del repository per applicare i mock
    RedisRepo = await import("../../../repositories/redis-repo.mjs");
  });

  // --------------------------------------------------------------------------
  // saveTemporaryUser
  // --------------------------------------------------------------------------
  describe("saveTemporaryUser", () => {
    it("should save user data to Redis with TTL", async () => {
      const email = "test@example.com";
      const userData = { firstName: "Mario", lastName: "Rossi" };
      const verificationCode = "123456";
      
      const expectedKey = `registration:${email}`;
      // Nota: la funzione aggiunge verificationCode all'oggetto userData
      const expectedValue = JSON.stringify({
        ...userData,
        verificationCode,
      });

      await RedisRepo.saveTemporaryUser(email, userData, verificationCode);

      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalledWith(expectedKey, expectedValue, {
        EX: 1800, // Verifica che il TTL sia impostato a 1800 secondi
      });
    });
  });

  // --------------------------------------------------------------------------
  // getTemporaryUser
  // --------------------------------------------------------------------------
  describe("getTemporaryUser", () => {
    it("should return parsed object if data exists in Redis", async () => {
      const email = "test@example.com";
      const storedObj = { firstName: "Mario", verificationCode: "123456" };
      
      // Simuliamo che Redis ritorni una stringa JSON
      mockGet.mockResolvedValue(JSON.stringify(storedObj));

      const result = await RedisRepo.getTemporaryUser(email);

      expect(mockGet).toHaveBeenCalledWith(`registration:${email}`);
      expect(result).toEqual(storedObj);
    });

    it("should return null if data does not exist in Redis", async () => {
      const email = "missing@example.com";
      
      // Simuliamo che Redis ritorni null (chiave non trovata)
      mockGet.mockResolvedValue(null);

      const result = await RedisRepo.getTemporaryUser(email);

      expect(mockGet).toHaveBeenCalledWith(`registration:${email}`);
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // deleteTemporaryUser
  // --------------------------------------------------------------------------
  describe("deleteTemporaryUser", () => {
    it("should delete the key from Redis", async () => {
      const email = "test@example.com";
      
      await RedisRepo.deleteTemporaryUser(email);

      expect(mockDel).toHaveBeenCalledWith(`registration:${email}`);
    });
  });
});