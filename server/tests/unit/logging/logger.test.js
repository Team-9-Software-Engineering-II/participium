import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// --- 1. SETUP MOCKS ---

const mockLoggerInstance = {
  add: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockCreateLogger = jest.fn(() => mockLoggerInstance);
const mockAddColors = jest.fn();

// Mock dei formati
const mockFormat = {
  combine: jest.fn((...args) => ({ type: "combined", args })),
  timestamp: jest.fn(() => "timestamp-format"),
  json: jest.fn(() => "json-format"),
  colorize: jest.fn(() => "colorize-format"),
  simple: jest.fn(() => "simple-format"),
  printf: jest.fn((templateFn) => ({ type: "printf", templateFn })), // Salviamo la funzione per testarla dopo
  errors: jest.fn(() => "errors-format"),
};

// Mock dei Transports
const mockConsoleTransport = jest.fn();
const mockDailyRotateFile = jest.fn();

// Mock Winston
jest.unstable_mockModule("winston", () => ({
  default: {
    createLogger: mockCreateLogger,
    addColors: mockAddColors,
    format: mockFormat,
    transports: {
      Console: mockConsoleTransport,
      DailyRotateFile: mockDailyRotateFile,
    },
  },
}));

// Mock winston-daily-rotate-file (importato per side-effect)
jest.unstable_mockModule("winston-daily-rotate-file", () => ({}));

// --- 2. TEST SUITE ---

describe("Logger (Unit)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // FONDAMENTALE: Resetta il modulo per ri-eseguire la logica di init
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --------------------------------------------------------------------------
  // SCENARIO 1: PRODUCTION ENVIRONMENT
  // --------------------------------------------------------------------------
  it("should create logger with info level and NO console transport in production", async () => {
    process.env.NODE_ENV = "production";

    // Importiamo il logger. Questo esegue tutto il codice top-level
    await import("../../../shared/logging/logger.mjs");

    // Verifica configurazione base
    expect(mockAddColors).toHaveBeenCalled();
    expect(mockDailyRotateFile).toHaveBeenCalledTimes(2); // Error + Combined

    // Verifica createLogger
    expect(mockCreateLogger).toHaveBeenCalledWith(expect.objectContaining({
      level: "info", // Production level
      transports: expect.any(Array)
    }));

    // Verifica che NON sia stato aggiunto il transport Console
    // In produzione l'if (process.env.NODE_ENV !== "production") è falso
    expect(mockLoggerInstance.add).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: DEVELOPMENT ENVIRONMENT
  // --------------------------------------------------------------------------
  it("should create logger with debug level and ADD console transport in development", async () => {
    process.env.NODE_ENV = "development";

    await import("../../../shared/logging/logger.mjs");

    // Verifica createLogger
    expect(mockCreateLogger).toHaveBeenCalledWith(expect.objectContaining({
      level: "debug", // Development level
    }));

    // Verifica che sia stato aggiunto il transport Console
    expect(mockConsoleTransport).toHaveBeenCalled();
    expect(mockLoggerInstance.add).toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: TESTING THE FORMATTER FUNCTION (Coverage Righe 23-28)
  // --------------------------------------------------------------------------
  it("should format log messages correctly using the custom printf function", async () => {
    process.env.NODE_ENV = "development";
    await import("../../../shared/logging/logger.mjs");

    // Dobbiamo recuperare la funzione passata a winston.format.printf
    // Abbiamo configurato il mock di 'printf' per restituire { type: "printf", templateFn }
    // winston.format.combine viene chiamato per creare devFormat.
    // combine riceve gli argomenti. Uno di questi è il risultato di printf.
    
    // Cerchiamo la chiamata a combine che contiene il printf (quella del devFormat)
    const combineCalls = mockFormat.combine.mock.calls;
    
    // Troviamo la chiamata che ha tra gli argomenti l'oggetto printf
    const devFormatCall = combineCalls.find(callArgs => 
      callArgs.some(arg => arg && arg.type === "printf")
    );
    
    const printfObj = devFormatCall.find(arg => arg.type === "printf");
    const formatterFn = printfObj.templateFn;

    // Ora eseguiamo la funzione di formattazione manualmente
    const infoMock = {
      timestamp: "2023-01-01 12:00:00",
      level: "info",
      message: "Test message",
      service: "my-service"
    };

    const output = formatterFn(infoMock);
    expect(output).toBe("2023-01-01 12:00:00 [my-service] info: Test message");

    // Testiamo il fallback del service (|| "APP")
    const infoMockNoService = {
      timestamp: "2023-01-01",
      level: "error",
      message: "Error msg"
    };
    const outputDefault = formatterFn(infoMockNoService);
    expect(outputDefault).toBe("2023-01-01 [APP] error: Error msg");
  });
});