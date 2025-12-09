import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// --- 1. SETUP MOCKS ---

// Mock delle funzioni del client Redis
const mockOn = jest.fn();
const mockConnect = jest.fn();

// Il client Redis simulato
const mockRedisClient = {
  on: mockOn,
  connect: mockConnect,
};

// Mock della libreria 'redis'
const mockCreateClient = jest.fn(() => mockRedisClient);
jest.unstable_mockModule("redis", () => ({
  createClient: mockCreateClient,
}));

// Mock del Logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};
jest.unstable_mockModule("../../../shared/logging/logger.mjs", () => ({
  default: mockLogger,
}));

// --- 2. TEST SUITE ---
describe("Redis Config (Unit)", () => {
  let RedisConfig;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules(); // Importante per rieseguire la createClient a ogni test
    process.env = { ...originalEnv };
    
    // Importiamo il modulo. Questo innesca subito createClient e .on()
    RedisConfig = await import("../../../config/redis.mjs");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create redis client with default URL if env var is missing", () => {
    // Verifica che createClient sia stato chiamato
    expect(mockCreateClient).toHaveBeenCalledWith({
      url: "redis://localhost:6379", // Default
    });

    // Verifica che i listener siano stati registrati
    expect(mockOn).toHaveBeenCalledTimes(2);
    expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("connect", expect.any(Function));
  });

  it("should create redis client with custom URL from env", async () => {
    jest.resetModules();
    process.env.REDIS_URL = "redis://custom:1234";
    
    // Re-importiamo per leggere la nuova env var
    await import("../../../config/redis.mjs");

    expect(mockCreateClient).toHaveBeenCalledWith({
      url: "redis://custom:1234",
    });
  });

  it("should connect to redis when connectRedis is called (Line 12)", async () => {
    await RedisConfig.connectRedis();
    expect(mockConnect).toHaveBeenCalled();
  });

  // --- TEST DEI CALLBACK (Righe 8 e 9) ---
  
  it("should log error when 'error' event is emitted", () => {
    // Recuperiamo la callback passata a .on('error', callback)
    // mockOn.mock.calls è un array di chiamate: [ ['error', cb], ['connect', cb] ]
    const errorCall = mockOn.mock.calls.find(call => call[0] === "error");
    const errorCallback = errorCall[1];

    // Eseguiamo manualmente la callback
    const testError = new Error("Connection failed");
    errorCallback(testError);

    expect(mockLogger.error).toHaveBeenCalledWith("Redis Client Error", testError);
  });

  it("should log info when 'connect' event is emitted", () => {
    // Recuperiamo la callback passata a .on('connect', callback)
    const connectCall = mockOn.mock.calls.find(call => call[0] === "connect");
    const connectCallback = connectCall[1];

    // Eseguiamo manualmente la callback
    connectCallback();

    expect(mockLogger.info).toHaveBeenCalledWith("Redis Client Connected");
  });
});