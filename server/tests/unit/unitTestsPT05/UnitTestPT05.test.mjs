import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- MOCKING REPORT CONTROLLER DEPENDENCIES (Service & Validator) ---
// Mock ReportService
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

// Mock Validator
const mockValidateCreateReportInput = jest.fn();

jest.unstable_mockModule("../../../shared/validators/report-validator.mjs", () => ({
  validateCreateReportInput: mockValidateCreateReportInput,
}));


// --- MOCKING CATEGORY REPOSITORY DEPENDENCIES (Sequelize Models and DB) ---
// Mock the Category model's primary methods
const mockCategoryModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

// Mock the TechnicalOffice model (needed for 'include' option)
const mockTechnicalOfficeModel = {};

// Mock the DB module (index.mjs)
const mockDb = {
  Category: mockCategoryModel,
  TechnicalOffice: mockTechnicalOfficeModel,
};

// Dynamically mock the DB module path (used by the repository)
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));


// --- DYNAMIC IMPORTS & MOCKS ---
let ReportControllers;
let ProblemCategoryRepo;

// Helper function to create mock response objects
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// --- START OF TESTS ---

describe("Application Tests (Controllers and Repositories)", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Import controllers and repository after mocks are defined
    const controllersModule = await import("../../../controllers/report-controller.js");
    ReportControllers = controllersModule;

    // We import the repository using its actual path relative to the test file
    ProblemCategoryRepo = await import("../../../repositories/problem-category-repo.mjs");

    // Set up standard mock req, res, next objects
    mockReq = {
      user: { id: 42 }, // Mock authenticated user (for createReport)
      params: {}, // Routing parameters
    };
    mockRes = createMockResponse();
    mockNext = jest.fn(); // Mock for error handling
  });

  // --------------------------------------------------------------------------
  // BLOCK 1: REPORT CONTROLLERS TESTS (EXISTING CODE)
  // --------------------------------------------------------------------------
  describe("Report Controllers", () => {
    // --------------------------------------------------------------------------
    // TEST: createReport
    // --------------------------------------------------------------------------
    describe("createReport", () => {
      const mockPayload = { title: "Damage", description: "Pothole on the road" };
      const mockCreatedReport = { id: 101, ...mockPayload, userId: 42 };

      it("should create a report and return 201 JSON", async () => {
        // Setup
        mockValidateCreateReportInput.mockReturnValue(mockPayload);
        mockCreateCitizenReport.mockResolvedValue(mockCreatedReport);

        // Execution
        await ReportControllers.createReport(mockReq, mockRes, mockNext);

        // Assertions
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
        // Setup: The validator handles the response and returns null
        mockValidateCreateReportInput.mockReturnValue(null);

        // Execution
        await ReportControllers.createReport(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockValidateCreateReportInput).toHaveBeenCalled();
        expect(mockCreateCitizenReport).not.toHaveBeenCalled(); // Service should not be called
        expect(mockRes.status).not.toHaveBeenCalled(); // No response sent by the controller
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should call next() if the service throws an error", async () => {
        // Setup
        const serviceError = new Error("DB error");
        mockValidateCreateReportInput.mockReturnValue(mockPayload);
        mockCreateCitizenReport.mockRejectedValue(serviceError);

        // Execution
        await ReportControllers.createReport(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockNext).toHaveBeenCalledWith(serviceError);
        expect(mockRes.status).not.toHaveBeenCalled(); // next handles the response
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
        // Setup
        mockGetAllReports.mockResolvedValue(mockReports);

        // Execution
        await ReportControllers.getAllReports(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockGetAllReports).toHaveBeenCalledTimes(1);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(mockReports);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should call next() if the service throws an error", async () => {
        // Setup
        const serviceError = new Error("Connection error");
        mockGetAllReports.mockRejectedValue(serviceError);

        // Execution
        await ReportControllers.getAllReports(mockReq, mockRes, mockNext);

        // Assertions
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
        // Setup
        mockReq.params.reportId = '5';
        mockGetReportById.mockResolvedValue(mockReport);

        // Execution
        await ReportControllers.getReportById(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockGetReportById).toHaveBeenCalledWith(5);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(mockReport);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it("should return 404 if the report is not found", async () => {
        // Setup
        mockReq.params.reportId = '999';
        mockGetReportById.mockResolvedValue(null);

        // Execution
        await ReportControllers.getReportById(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockGetReportById).toHaveBeenCalledWith(999);
        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Report not found." });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it.each([
        ['0'],
        ['-5'],
        ['not-a-number']
      ])("should return 400 for invalid reportId: %s", async (invalidId) => {
        // Setup
        mockReq.params.reportId = invalidId;

        // Execution
        await ReportControllers.getReportById(mockReq, mockRes, mockNext);

        // Assertions
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
        // Setup
        mockReq.params.userId = '10';
        mockGetReportsByUserId.mockResolvedValue(mockUserReports);

        // Execution
        await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockGetReportsByUserId).toHaveBeenCalledWith(10);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(mockUserReports);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it.each([
        ['0'],
        ['-1'],
        ['abc']
      ])("should return 400 for invalid userId: %s", async (invalidId) => {
        // Setup
        mockReq.params.userId = invalidId;

        // Execution
        await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockGetReportsByUserId).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "userId must be a positive integer." });
      });

      it("should call next() if the service throws an error", async () => {
        // Setup
        const serviceError = new Error("Service issue");
        mockReq.params.userId = '10';
        mockGetReportsByUserId.mockRejectedValue(serviceError);

        // Execution
        await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

        // Assertions
        expect(mockNext).toHaveBeenCalledWith(serviceError);
        expect(mockRes.status).not.toHaveBeenCalled();
      });
    });
  });

  // --------------------------------------------------------------------------
  // BLOCK 2: PROBLEM CATEGORY REPOSITORY TESTS (NEW CODE)
  // --------------------------------------------------------------------------
  describe("Problem Category Repository", () => {
    // Define mock data for the repository tests
    const mockCategoryData = {
      name: "Roads",
      description: "Potholes and maintenance",
    };
    const mockCategoryFound = { id: 1, ...mockCategoryData };
    const includeOption = {
      include: { model: mockTechnicalOfficeModel, as: "technicalOffice" },
    };

    // --------------------------------------------------------------------------
    // createProblemCategory
    // --------------------------------------------------------------------------
    describe("createProblemCategory", () => {
      it("should call Category.create with the correct data", async () => {
        mockCategoryModel.create.mockResolvedValue(mockCategoryFound);

        const result = await ProblemCategoryRepo.createProblemCategory(mockCategoryData);

        expect(mockCategoryModel.create).toHaveBeenCalledWith(mockCategoryData);
        expect(result).toEqual(mockCategoryFound);
      });
    });

    // --------------------------------------------------------------------------
    // findAllProblemsCategories
    // --------------------------------------------------------------------------
    describe("findAllProblemsCategories", () => {
      it("should call Category.findAll including TechnicalOffice", async () => {
        const mockAllCategories = [mockCategoryFound, { id: 2, name: "Waste" }];
        mockCategoryModel.findAll.mockResolvedValue(mockAllCategories);

        const result = await ProblemCategoryRepo.findAllProblemsCategories();

        expect(mockCategoryModel.findAll).toHaveBeenCalledWith(includeOption);
        expect(result).toEqual(mockAllCategories);
      });
    });

    // --------------------------------------------------------------------------
    // findProblemCategoryById
    // --------------------------------------------------------------------------
    describe("findProblemCategoryById", () => {
      const categoryId = 1;

      it("should call Category.findByPk with the ID and include option", async () => {
        mockCategoryModel.findByPk.mockResolvedValue(mockCategoryFound);

        const result = await ProblemCategoryRepo.findProblemCategoryById(categoryId);

        expect(mockCategoryModel.findByPk).toHaveBeenCalledWith(categoryId, includeOption);
        expect(result).toEqual(mockCategoryFound);
      });

      it("should return null if category is not found by ID", async () => {
        mockCategoryModel.findByPk.mockResolvedValue(null);
        const result = await ProblemCategoryRepo.findProblemCategoryById(999);
        expect(result).toBeNull();
      });
    });

    // --------------------------------------------------------------------------
    // findProblemCategoryByName
    // --------------------------------------------------------------------------
    describe("findProblemCategoryByName", () => {
      const categoryName = "Roads";

      it("should call Category.findOne with the name and include option", async () => {
        mockCategoryModel.findOne.mockResolvedValue(mockCategoryFound);
        const expectedOptions = {
          where: { name: categoryName },
          ...includeOption,
        };

        const result = await ProblemCategoryRepo.findProblemCategoryByName(categoryName);

        expect(mockCategoryModel.findOne).toHaveBeenCalledWith(expectedOptions);
        expect(result).toEqual(mockCategoryFound);
      });

      it("should return null if category is not found by name", async () => {
        mockCategoryModel.findOne.mockResolvedValue(null);
        const result = await ProblemCategoryRepo.findProblemCategoryByName("Nonexistent");
        expect(result).toBeNull();
      });
    });

    // --------------------------------------------------------------------------
    // updateCategory
    // --------------------------------------------------------------------------
    describe("updateCategory", () => {
      const updateData = { description: "Updated description" };
      const categoryId = 1;

      it("should return true if one row was updated", async () => {
        mockCategoryModel.update.mockResolvedValue([1]);

        const result = await ProblemCategoryRepo.updateCategory(categoryId, updateData);

        expect(mockCategoryModel.update).toHaveBeenCalledWith(updateData, {
          where: { id: categoryId },
        });
        expect(result).toBe(true);
      });

      it("should return false if no row was updated", async () => {
        mockCategoryModel.update.mockResolvedValue([0]);

        const result = await ProblemCategoryRepo.updateCategory(999, updateData);

        expect(result).toBe(false);
      });
    });

    // --------------------------------------------------------------------------
    // deleteCategory
    // --------------------------------------------------------------------------
    describe("deleteCategory", () => {
      const categoryId = 1;

      it("should return true if one row was deleted", async () => {
        mockCategoryModel.destroy.mockResolvedValue(1);

        const result = await ProblemCategoryRepo.deleteCategory(categoryId);

        expect(mockCategoryModel.destroy).toHaveBeenCalledWith({
          where: { id: categoryId },
        });
        expect(result).toBe(true);
      });

      it("should return false if no row was deleted", async () => {
        mockCategoryModel.destroy.mockResolvedValue(0);

        const result = await ProblemCategoryRepo.deleteCategory(999);

        expect(result).toBe(false);
      });
    });
  });
});