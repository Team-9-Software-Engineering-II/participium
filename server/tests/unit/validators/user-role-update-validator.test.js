import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import AppError from "../../../shared/utils/app-error.mjs"; 
// NOTA: Assicurati che il path per AppError sia corretto rispetto alla cartella dei test!
// Se tests è nella root, potrebbe essere ../../server/... oppure ../../../shared/... 
// Controlla la tua struttura cartelle.

// --- 1. MOCK DELLE DIPENDENZE ---

// Mockiamo common-validator per isolare il test
const mockIsIdNumberAndPositive = jest.fn();

jest.unstable_mockModule("../../../shared/validators/common-validator.mjs", () => ({
  isIdNumberAndPositive: mockIsIdNumberAndPositive,
}));

// --- 2. TEST SUITE ---

let validateUserRoleUpdateInput;

describe("validateUserRoleUpdateInput (Unit)", () => {
  beforeAll(async () => {
    // Importiamo il validatore DOPO aver mockato le dipendenze
    const validatorModule = await import(
      "../../../shared/validators/user-role-update-validator.mjs"
    );
    validateUserRoleUpdateInput = validatorModule.validateUserRoleUpdateInput;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock behavior: accetta qualsiasi numero positivo
    mockIsIdNumberAndPositive.mockImplementation((id) => !isNaN(id) && id > 0);
  });

  // --------------------------------------------------------------------------
  // CASI POSITIVI (Happy Path)
  // --------------------------------------------------------------------------
  it("should return validated payload for valid roleIds array", () => {
    const req = { body: { roleIds: [1, 2, 3] } };

    const result = validateUserRoleUpdateInput(req);

    expect(result).toEqual({ roleIds: [1, 2, 3] });
    expect(mockIsIdNumberAndPositive).toHaveBeenCalledTimes(3);
  });

  it("should parse string numbers into integers", () => {
    const req = { body: { roleIds: ["10", "20"] } };

    const result = validateUserRoleUpdateInput(req);

    expect(result).toEqual({ roleIds: [10, 20] });
  });

  // --------------------------------------------------------------------------
  // CASI DI ERRORE (Struttura Input)
  // --------------------------------------------------------------------------
  it("should throw 400 if roleIds is missing", () => {
    const req = { body: {} };

    expect(() => validateUserRoleUpdateInput(req)).toThrow(AppError);
    try {
      validateUserRoleUpdateInput(req);
    } catch (e) {
      expect(e.message).toBe("roleIds must be an array.");
      expect(e.statusCode).toBe(400);
    }
  });

  it("should throw 400 if roleIds is not an array", () => {
    const req = { body: { roleIds: "not-an-array" } };

    expect(() => validateUserRoleUpdateInput(req)).toThrow("roleIds must be an array.");
  });

  it("should throw 400 if roleIds is an empty array", () => {
    const req = { body: { roleIds: [] } };

    expect(() => validateUserRoleUpdateInput(req)).toThrow(
      "roleIds array cannot be empty. At least one role must be assigned."
    );
  });

  // --------------------------------------------------------------------------
  // CASI DI ERRORE (Contenuto Input)
  // --------------------------------------------------------------------------
  it("should throw 400 if array contains invalid IDs (negative/zero)", () => {
    const req = { body: { roleIds: [1, -5, 0] } };
    
    // Simuliamo che il validatore comune ritorni false per -5 e 0
    mockIsIdNumberAndPositive.mockImplementation(id => id > 0);

    expect(() => validateUserRoleUpdateInput(req)).toThrow(AppError);
    
    try {
      validateUserRoleUpdateInput(req);
    } catch (e) {
      expect(e.message).toContain("Invalid roleIds");
      expect(e.message).toContain("must be a positive integer");
    }
  });

  it("should throw 400 if array contains duplicates", () => {
    const req = { body: { roleIds: [1, 2, 1] } }; // '1' è duplicato

    expect(() => validateUserRoleUpdateInput(req)).toThrow(AppError);

    try {
      validateUserRoleUpdateInput(req);
    } catch (e) {
      expect(e.message).toContain("roleIds array contains duplicate values");
    }
  });

  it("should aggregate multiple errors", () => {
    const req = { body: { roleIds: [1, -5, 1] } }; // -5 invalido E 1 duplicato

    try {
      validateUserRoleUpdateInput(req);
    } catch (e) {
      expect(e.message).toContain("must be a positive integer");
      expect(e.message).toContain("contains duplicate values");
    }
  });

  it("should handle missing req.body gracefully (nullish coalescing)", () => {
    // Caso: req.body non esiste (undefined)
    const req = {}; 
    expect(() => validateUserRoleUpdateInput(req)).toThrow("roleIds must be an array.");
  });
});