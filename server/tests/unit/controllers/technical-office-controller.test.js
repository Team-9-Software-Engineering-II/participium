import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- MOCKING TECHNICAL OFFICE CONTROLLER DEPENDENCIES (Service) ---
const mockGetAllSimplifiedTechnicalOffices = jest.fn();

jest.unstable_mockModule("../../../services/technical-office-service.mjs", () => ({
  TechnicalOfficeService: {
    getAllSimplifiedTechnicalOffices: mockGetAllSimplifiedTechnicalOffices,
  },
}));

// --- DYNAMIC IMPORTS & SETUP ---
let TechnicalOfficeControllers;

// Helper function to create mock response objects
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Technical Office Controllers (Unit)", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import controllers after mocks are defined
    const controllersModule = await import("../../../controllers/technical-office-controller.mjs");
    TechnicalOfficeControllers = controllersModule;

    // Set up standard mock req, res, next objects
    mockReq = {};
    mockRes = createMockResponse();
    mockNext = jest.fn(); // Mock for error handling
  });

  // --------------------------------------------------------------------------
  // TEST: getAllTechnicalOffices
  // --------------------------------------------------------------------------
  describe("getAllTechnicalOffices", () => {
    const mockSimplifiedOffices = [
      { id: 1, name: "Lighting Office" },
      { id: 2, name: "Road Maintenance Office" }
    ];

    it("should return all technical offices with status 200", async () => {
      mockGetAllSimplifiedTechnicalOffices.mockResolvedValue(mockSimplifiedOffices);

      await TechnicalOfficeControllers.getAllTechnicalOffices(mockReq, mockRes, mockNext);

      expect(mockGetAllSimplifiedTechnicalOffices).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockSimplifiedOffices);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return empty array when no technical offices exist", async () => {
      mockGetAllSimplifiedTechnicalOffices.mockResolvedValue([]);

      await TechnicalOfficeControllers.getAllTechnicalOffices(mockReq, mockRes, mockNext);

      expect(mockGetAllSimplifiedTechnicalOffices).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next() if the service throws an error", async () => {
      const serviceError = new Error("Database connection failed");
      mockGetAllSimplifiedTechnicalOffices.mockRejectedValue(serviceError);

      await TechnicalOfficeControllers.getAllTechnicalOffices(mockReq, mockRes, mockNext);

      expect(mockGetAllSimplifiedTechnicalOffices).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});

