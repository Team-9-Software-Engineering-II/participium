import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- MOCKING REPORT CONTROLLER DEPENDENCIES (Service & Validator) ---
const mockCreateCitizenReport = jest.fn();
const mockGetAllReports = jest.fn();
const mockGetReportById = jest.fn();
const mockGetReportsByUserId = jest.fn();

jest.unstable_mockModule("../../../services/report-service.mjs", () => ({
  ReportService: {
    createCitizenReport: mockCreateCitizenReport,
    getAllReports: mockGetAllReports,
    getReportById: mockGetReportById,
    getReportsByUserId: mockGetReportsByUserId,
  },
}));

const mockValidateCreateReportInput = jest.fn();

jest.unstable_mockModule("../../../shared/validators/report-validator.mjs", () => ({
  validateCreateReportInput: mockValidateCreateReportInput,
}));


// --- DYNAMIC IMPORTS & SETUP ---
let ReportControllers;

// Helper function to create mock response objects
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Report Controllers (Unit)", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import controllers after mocks are defined
    const controllersModule = await import("../../../controllers/report-controller.js");
    ReportControllers = controllersModule;

    // Set up standard mock req, res, next objects
    mockReq = {
      user: { id: 42 }, // Mock authenticated user (for createReport)
      params: {}, // Routing parameters
    };
    mockRes = createMockResponse();
    mockNext = jest.fn(); // Mock for error handling
  });

  // --------------------------------------------------------------------------
  // TEST: createReport
  // --------------------------------------------------------------------------
  describe("createReport", () => {
    const mockPayload = { title: "Damage", description: "Pothole on the road" };
    const mockCreatedReport = { id: 101, ...mockPayload, userId: 42 };

    it("should create a report and return 201 JSON", async () => {
      mockValidateCreateReportInput.mockReturnValue(mockPayload);
      mockCreateCitizenReport.mockResolvedValue(mockCreatedReport);

      await ReportControllers.createReport(mockReq, mockRes, mockNext);

      expect(mockValidateCreateReportInput).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockCreateCitizenReport).toHaveBeenCalledWith(
        mockReq.user.id,
        mockPayload
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreatedReport);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return if validation fails (handled by validator)", async () => {
      mockValidateCreateReportInput.mockReturnValue(null);

      await ReportControllers.createReport(mockReq, mockRes, mockNext);

      expect(mockValidateCreateReportInput).toHaveBeenCalled();
      expect(mockCreateCitizenReport).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled(); 
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next() if the service throws an error", async () => {
      const serviceError = new Error("DB error");
      mockValidateCreateReportInput.mockReturnValue(mockPayload);
      mockCreateCitizenReport.mockRejectedValue(serviceError);

      await ReportControllers.createReport(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getAllReports
  // --------------------------------------------------------------------------
  describe("getAllReports", () => {
    const mockReports = [
      { id: 1, title: "R1" },
      { id: 2, title: "R2" }
    ];

    it("should return all reports with status 200", async () => {
      mockGetAllReports.mockResolvedValue(mockReports);

      await ReportControllers.getAllReports(mockReq, mockRes, mockNext);

      expect(mockGetAllReports).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockReports);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next() if the service throws an error", async () => {
      const serviceError = new Error("Connection error");
      mockGetAllReports.mockRejectedValue(serviceError);

      await ReportControllers.getAllReports(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getReportById
  // --------------------------------------------------------------------------
  describe("getReportById", () => {
    const mockReport = { id: 5, title: "Report 5" };

    it("should return the report with status 200 if found", async () => {
      mockReq.params.reportId = '5';
      mockGetReportById.mockResolvedValue(mockReport);

      await ReportControllers.getReportById(mockReq, mockRes, mockNext);

      expect(mockGetReportById).toHaveBeenCalledWith(5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockReport);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 404 if the report is not found", async () => {
      mockReq.params.reportId = '999';
      mockGetReportById.mockResolvedValue(null);

      await ReportControllers.getReportById(mockReq, mockRes, mockNext);

      expect(mockGetReportById).toHaveBeenCalledWith(999);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Report not found." });
    });

    it("should call next(error) if service throws an error", async () => {
      // Setup
      const serviceError = new Error("Database failure");
      mockReq.params.reportId = '5'; // ID valido per superare il primo controllo
      mockGetReportById.mockRejectedValue(serviceError); // Il servizio fallisce

      // Execution
      await ReportControllers.getReportById(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it.each([
      ['0'],
      ['-5'],
      ['not-a-number']
    ])("should return 400 for invalid reportId: %s", async (invalidId) => {
      mockReq.params.reportId = invalidId;

      await ReportControllers.getReportById(mockReq, mockRes, mockNext);

      expect(mockGetReportById).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "reportId must be a positive integer." });
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getReportsByUser
  // --------------------------------------------------------------------------
  describe("getReportsByUser", () => {
    const mockUserReports = [
      { id: 1, userId: 10 },
      { id: 3, userId: 10 }
    ];

    it("should return the user's reports with status 200", async () => {
      mockReq.params.userId = '10';
      mockGetReportsByUserId.mockResolvedValue(mockUserReports);

      await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

      expect(mockGetReportsByUserId).toHaveBeenCalledWith(10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUserReports);
    });

    it.each([
      ['0'],
      ['-1'],
      ['abc']
    ])("should return 400 for invalid userId: %s", async (invalidId) => {
      mockReq.params.userId = invalidId;

      await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

      expect(mockGetReportsByUserId).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "userId must be a positive integer." });
    });

    it("should call next() if the service throws an error", async () => {
      const serviceError = new Error("Service issue");
      mockReq.params.userId = '10';
      mockGetReportsByUserId.mockRejectedValue(serviceError);

      await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});