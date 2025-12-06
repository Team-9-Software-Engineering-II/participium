import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- MOCKING REPORT CONTROLLER DEPENDENCIES (Service & Validator) ---
const mockCreateCitizenReport = jest.fn();
const mockGetAllReports = jest.fn();
const mockGetReportById = jest.fn();
const mockGetReportsByUserId = jest.fn();
const mockGetAllReportsFilteredByStatus = jest.fn();
const mockAcceptReport = jest.fn();
const mockRejectReport = jest.fn();
const mockUpdateReportCategory = jest.fn();
const mockGetReportsAssignedToOfficer = jest.fn();
const mockGetEligibleCompaniesForReport = jest.fn();
const mockAssignReportToExternalMaintainer = jest.fn();
const mockFindAllProblemsCategories = jest.fn();
const mockUpdateReport = jest.fn();

jest.unstable_mockModule(
  "../../../repositories/problem-category-repo.mjs",
  () => ({
    findAllProblemsCategories: mockFindAllProblemsCategories,
  })
);

jest.unstable_mockModule("../../../services/report-service.mjs", () => ({
  ReportService: {
    createCitizenReport: mockCreateCitizenReport,
    getAllReports: mockGetAllReports,
    getReportById: mockGetReportById,
    getReportsByUserId: mockGetReportsByUserId,
    getAllReportsFilteredByStatus: mockGetAllReportsFilteredByStatus,
    acceptReport: mockAcceptReport,
    rejectReport: mockRejectReport,
    updateReportCategory: mockUpdateReportCategory,
    getReportsAssignedToOfficer: mockGetReportsAssignedToOfficer,
    getEligibleCompaniesForReport: mockGetEligibleCompaniesForReport,
    assignReportToExternalMaintainer: mockAssignReportToExternalMaintainer,
    updateReport: mockUpdateReport,
  },
}));

const mockValidateCreateReportInput = jest.fn();
const mockValidateNewReportCategory = jest.fn();
const mockValidateReportToBeAcceptedOrRejected = jest.fn();

jest.unstable_mockModule(
  "../../../shared/validators/report-validator.mjs",
  () => ({
    validateCreateReportInput: mockValidateCreateReportInput,
    validateNewReportCategory: mockValidateNewReportCategory,
    validateReportToBeAcceptedOrRejected:
      mockValidateReportToBeAcceptedOrRejected,
  })
);

const mockIsIdNumberAndPositive = jest.fn();

jest.unstable_mockModule(
  "../../../shared/validators/common-validator.mjs",
  () => ({
    isIdNumberAndPositive: mockIsIdNumberAndPositive,
  })
);

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
    const controllersModule = await import(
      "../../../controllers/report-controller.js"
    );
    ReportControllers = controllersModule;

    // Set up standard mock req, res, next objects
    mockReq = {
      user: { id: 42 }, // Mock authenticated user (for createReport)
      params: {}, // Routing parameters
      body: {}, // Request body
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

      expect(mockValidateCreateReportInput).toHaveBeenCalledWith(
        mockReq,
        mockRes
      );
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
      { id: 2, title: "R2" },
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
      mockReq.params.reportId = "5";
      mockGetReportById.mockResolvedValue(mockReport);

      await ReportControllers.getReportById(mockReq, mockRes, mockNext);

      expect(mockGetReportById).toHaveBeenCalledWith(5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockReport);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 404 if the report is not found", async () => {
      mockReq.params.reportId = "999";
      mockGetReportById.mockResolvedValue(null);

      await ReportControllers.getReportById(mockReq, mockRes, mockNext);

      expect(mockGetReportById).toHaveBeenCalledWith(999);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Report not found.",
      });
    });

    it("should call next(error) if service throws an error", async () => {
      // Setup
      const serviceError = new Error("Database failure");
      mockReq.params.reportId = "5"; // ID valido per superare il primo controllo
      mockGetReportById.mockRejectedValue(serviceError); // Il servizio fallisce

      // Execution
      await ReportControllers.getReportById(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it.each([["0"], ["-5"], ["not-a-number"]])(
      "should return 400 for invalid reportId: %s",
      async (invalidId) => {
        mockReq.params.reportId = invalidId;

        await ReportControllers.getReportById(mockReq, mockRes, mockNext);

        expect(mockGetReportById).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "reportId must be a positive integer.",
        });
      }
    );
  });

  // --------------------------------------------------------------------------
  // TEST: getReportsByUser
  // --------------------------------------------------------------------------
  describe("getReportsByUser", () => {
    const mockUserReports = [
      { id: 1, userId: 10 },
      { id: 3, userId: 10 },
    ];

    it("should return the user's reports with status 200", async () => {
      mockReq.params.userId = "10";
      mockGetReportsByUserId.mockResolvedValue(mockUserReports);

      await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

      expect(mockGetReportsByUserId).toHaveBeenCalledWith(10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUserReports);
    });

    it.each([["0"], ["-1"], ["abc"]])(
      "should return 400 for invalid userId: %s",
      async (invalidId) => {
        mockReq.params.userId = invalidId;

        await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

        expect(mockGetReportsByUserId).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "userId must be a positive integer.",
        });
      }
    );

    it("should call next() if the service throws an error", async () => {
      const serviceError = new Error("Service issue");
      mockReq.params.userId = "10";
      mockGetReportsByUserId.mockRejectedValue(serviceError);

      await ReportControllers.getReportsByUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getAssignedReports
  // --------------------------------------------------------------------------
  describe("getAssignedReports", () => {
    const mockAssignedReports = [
      { id: 1, status: "Assigned", title: "Report 1" },
      { id: 2, status: "Assigned", title: "Report 2" },
    ];

    it("should return assigned reports with status 200", async () => {
      mockGetAllReportsFilteredByStatus.mockResolvedValue(mockAssignedReports);

      await ReportControllers.getAssignedReports(mockReq, mockRes, mockNext);

      expect(mockGetAllReportsFilteredByStatus).toHaveBeenCalledWith(
        "Assigned",
        false
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockAssignedReports);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return empty array when no assigned reports exist", async () => {
      mockGetAllReportsFilteredByStatus.mockResolvedValue([]);

      await ReportControllers.getAssignedReports(mockReq, mockRes, mockNext);

      expect(mockGetAllReportsFilteredByStatus).toHaveBeenCalledWith(
        "Assigned",
        false
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it("should call next() if the service throws an error", async () => {
      const serviceError = new Error("Database connection failed");
      mockGetAllReportsFilteredByStatus.mockRejectedValue(serviceError);

      await ReportControllers.getAssignedReports(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: changeProblemCategory
  // --------------------------------------------------------------------------
  describe("changeProblemCategory", () => {
    const mockValidatedCategory = { categoryId: 5 };
    const mockUpdatedReport = { success: true };

    beforeEach(() => {
      mockIsIdNumberAndPositive.mockReturnValue(true);
    });

    it("should update report category and return 200 with success", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { categoryId: 5 };
      mockValidateNewReportCategory.mockResolvedValue(mockValidatedCategory);
      mockUpdateReportCategory.mockResolvedValue(mockUpdatedReport);

      await ReportControllers.changeProblemCategory(mockReq, mockRes, mockNext);

      expect(mockIsIdNumberAndPositive).toHaveBeenCalledWith(10);
      expect(mockValidateNewReportCategory).toHaveBeenCalledWith(mockReq.body);
      expect(mockUpdateReportCategory).toHaveBeenCalledWith(
        10,
        mockValidatedCategory
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: mockUpdatedReport });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid reportId format", async () => {
      mockReq.params.reportId = "0";
      mockIsIdNumberAndPositive.mockReturnValue(false);

      await ReportControllers.changeProblemCategory(mockReq, mockRes, mockNext);

      expect(mockIsIdNumberAndPositive).toHaveBeenCalledWith(0);
      expect(mockValidateNewReportCategory).not.toHaveBeenCalled();
      expect(mockUpdateReportCategory).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid ID format",
      });
    });

    it.each([["-1"], ["not-a-number"]])(
      "should return 400 for invalid reportId: %s",
      async (invalidId) => {
        mockReq.params.reportId = invalidId;
        const parsedId = Number(invalidId);
        mockIsIdNumberAndPositive.mockReturnValue(false);

        await ReportControllers.changeProblemCategory(
          mockReq,
          mockRes,
          mockNext
        );

        expect(mockIsIdNumberAndPositive).toHaveBeenCalledWith(parsedId);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "Invalid ID format",
        });
      }
    );

    it("should call next() if validator throws an error", async () => {
      const validationError = new Error("Invalid category ID");
      validationError.statusCode = 400;
      mockReq.params.reportId = "10";
      mockValidateNewReportCategory.mockRejectedValue(validationError);

      await ReportControllers.changeProblemCategory(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(validationError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should call next() if service throws an error", async () => {
      const serviceError = new Error("Report not found");
      serviceError.statusCode = 404;
      mockReq.params.reportId = "10";
      mockValidateNewReportCategory.mockResolvedValue(mockValidatedCategory);
      mockUpdateReportCategory.mockRejectedValue(serviceError);

      await ReportControllers.changeProblemCategory(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: reviewReport
  // --------------------------------------------------------------------------
  describe("reviewReport", () => {
    const mockUpdatedReport = {
      id: 10,
      status: "Assigned",
      title: "Report 10",
    };

    it("should accept a report (action: assigned) and return 200", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { action: "assigned" };
      mockAcceptReport.mockResolvedValue(mockUpdatedReport);

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockAcceptReport).toHaveBeenCalledWith(10);
      expect(mockRejectReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedReport);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject a report (action: rejected) with reason and return 200", async () => {
      const rejectionReason = "Insufficient information provided";
      mockReq.params.reportId = "10";
      mockReq.body = { action: "rejected", rejectionReason };
      const mockRejectedReport = {
        id: 10,
        status: "Rejected",
        rejection_reason: rejectionReason,
      };
      mockRejectReport.mockResolvedValue(mockRejectedReport);

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockRejectReport).toHaveBeenCalledWith(10, rejectionReason);
      expect(mockAcceptReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockRejectedReport);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 when rejecting without rejection reason", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { action: "rejected", rejectionReason: "" };

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockAcceptReport).not.toHaveBeenCalled();
      expect(mockRejectReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Rejection reason is mandatory when rejecting a report.",
      });
    });

    it("should return 400 when rejecting with whitespace-only rejection reason", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { action: "rejected", rejectionReason: "   " };

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockAcceptReport).not.toHaveBeenCalled();
      expect(mockRejectReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Rejection reason is mandatory when rejecting a report.",
      });
    });

    it("should return 400 when rejecting without rejectionReason field", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { action: "rejected" };

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockAcceptReport).not.toHaveBeenCalled();
      expect(mockRejectReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Rejection reason is mandatory when rejecting a report.",
      });
    });

    it("should return 400 for invalid action", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { action: "invalid_action" };

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockAcceptReport).not.toHaveBeenCalled();
      expect(mockRejectReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid action. Allowed values: 'assigned', 'rejected'.",
      });
    });

    it("should return 400 for missing action", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = {};

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockAcceptReport).not.toHaveBeenCalled();
      expect(mockRejectReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid action. Allowed values: 'assigned', 'rejected'.",
      });
    });

    it.each([["0"], ["-5"], ["not-a-number"]])(
      "should return 400 for invalid reportId: %s",
      async (invalidId) => {
        mockReq.params.reportId = invalidId;
        mockReq.body = { action: "assigned" };

        await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

        expect(mockAcceptReport).not.toHaveBeenCalled();
        expect(mockRejectReport).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "reportId must be a positive integer.",
        });
      }
    );

    it("should call next() if acceptReport service throws an error", async () => {
      const serviceError = new Error(
        "Report is not in 'Pending Approval' status"
      );
      serviceError.statusCode = 409;
      mockReq.params.reportId = "10";
      mockReq.body = { action: "assigned" };
      mockAcceptReport.mockRejectedValue(serviceError);

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockAcceptReport).toHaveBeenCalledWith(10);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should call next() if rejectReport service throws an error", async () => {
      const serviceError = new Error("Report not found");
      serviceError.statusCode = 404;
      mockReq.params.reportId = "10";
      mockReq.body = { action: "rejected", rejectionReason: "Invalid data" };
      mockRejectReport.mockRejectedValue(serviceError);

      await ReportControllers.reviewReport(mockReq, mockRes, mockNext);

      expect(mockRejectReport).toHaveBeenCalledWith(10, "Invalid data");
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getMyAssignedReports
  // --------------------------------------------------------------------------
  describe("getMyAssignedReports", () => {
    const mockAssignedReports = [
      { id: 1, status: "Assigned", title: "Report 1", technicalOfficerId: 42 },
      { id: 2, status: "Assigned", title: "Report 2", technicalOfficerId: 42 },
    ];

    it("should return assigned reports for the logged-in technical staff member with status 200", async () => {
      mockReq.user.id = 42;
      mockGetReportsAssignedToOfficer.mockResolvedValue(mockAssignedReports);

      await ReportControllers.getMyAssignedReports(mockReq, mockRes, mockNext);

      expect(mockGetReportsAssignedToOfficer).toHaveBeenCalledWith(42);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockAssignedReports);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return empty array when no reports are assigned to the officer", async () => {
      mockReq.user.id = 42;
      mockGetReportsAssignedToOfficer.mockResolvedValue([]);

      await ReportControllers.getMyAssignedReports(mockReq, mockRes, mockNext);

      expect(mockGetReportsAssignedToOfficer).toHaveBeenCalledWith(42);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next() if the service throws an error", async () => {
      const serviceError = new Error("Database connection failed");
      mockReq.user.id = 42;
      mockGetReportsAssignedToOfficer.mockRejectedValue(serviceError);

      await ReportControllers.getMyAssignedReports(mockReq, mockRes, mockNext);

      expect(mockGetReportsAssignedToOfficer).toHaveBeenCalledWith(42);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getEligibleCompanies
  // --------------------------------------------------------------------------
  describe("getEligibleCompanies", () => {
    const mockCompanies = [
      {
        id: 1,
        name: "Enel X",
        address: "Via Roma 1",
        region: "Piemonte",
        country: "Italy",
      },
      {
        id: 2,
        name: "Acea",
        address: "Via Milano 2",
        region: "Lazio",
        country: "Italy",
      },
    ];

    it("should return eligible companies with status 200 for valid reportId", async () => {
      mockReq.params.reportId = "10";
      mockGetEligibleCompaniesForReport.mockResolvedValue(mockCompanies);

      await ReportControllers.getEligibleCompanies(mockReq, mockRes, mockNext);

      expect(mockGetEligibleCompaniesForReport).toHaveBeenCalledWith(10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCompanies);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return empty array when no companies are eligible", async () => {
      mockReq.params.reportId = "10";
      mockGetEligibleCompaniesForReport.mockResolvedValue([]);

      await ReportControllers.getEligibleCompanies(mockReq, mockRes, mockNext);

      expect(mockGetEligibleCompaniesForReport).toHaveBeenCalledWith(10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it.each([["0"], ["-5"], ["not-a-number"], ["3.14"]])(
      "should return 400 for invalid reportId: %s",
      async (invalidId) => {
        mockReq.params.reportId = invalidId;

        await ReportControllers.getEligibleCompanies(
          mockReq,
          mockRes,
          mockNext
        );

        expect(mockGetEligibleCompaniesForReport).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: "reportId must be a positive integer.",
        });
        expect(mockNext).not.toHaveBeenCalled();
      }
    );

    it("should call next() if service throws 404 error (report not found)", async () => {
      const serviceError = new Error("Report not found.");
      serviceError.statusCode = 404;
      mockReq.params.reportId = "999";
      mockGetEligibleCompaniesForReport.mockRejectedValue(serviceError);

      await ReportControllers.getEligibleCompanies(mockReq, mockRes, mockNext);

      expect(mockGetEligibleCompaniesForReport).toHaveBeenCalledWith(999);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should call next() if service throws any other error", async () => {
      const serviceError = new Error("Database connection failed");
      serviceError.statusCode = 500;
      mockReq.params.reportId = "10";
      mockGetEligibleCompaniesForReport.mockRejectedValue(serviceError);

      await ReportControllers.getEligibleCompanies(mockReq, mockRes, mockNext);

      expect(mockGetEligibleCompaniesForReport).toHaveBeenCalledWith(10);
      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("assignReportToExternalMaintainer", () => {
    const mockUpdatedReport = {
      id: 10,
      status: "Assigned",
      externalMaintainerId: 99,
    };

    it("should assign report to external maintainer and return 200", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { companyId: 5 };
      mockAssignReportToExternalMaintainer.mockResolvedValue(mockUpdatedReport);

      await ReportControllers.assignReportToExternalMaintainer(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockAssignReportToExternalMaintainer).toHaveBeenCalledWith(10, 5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedReport);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 if companyId is missing", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = {}; // companyId mancante

      await ReportControllers.assignReportToExternalMaintainer(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockAssignReportToExternalMaintainer).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "companyId is required.",
      });
    });

    it("should return 400 if companyId is not a valid integer", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { companyId: "abc" };

      await ReportControllers.assignReportToExternalMaintainer(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockAssignReportToExternalMaintainer).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "companyId must be a positive integer.",
      });
    });

    it.each([["0"], ["-5"], ["not-a-number"]])(
      "should return 400 for invalid reportId: %s",
      async (invalidId) => {
        mockReq.params.reportId = invalidId;
        mockReq.body = { companyId: 5 };

        await ReportControllers.assignReportToExternalMaintainer(
          mockReq,
          mockRes,
          mockNext
        );

        expect(mockAssignReportToExternalMaintainer).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
      }
    );

    it("should call next() if service throws an error", async () => {
      const serviceError = new Error("No maintainers available");
      serviceError.statusCode = 409;
      mockReq.params.reportId = "10";
      mockReq.body = { companyId: 5 };
      mockAssignReportToExternalMaintainer.mockRejectedValue(serviceError);

      await ReportControllers.assignReportToExternalMaintainer(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(serviceError);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getPendingApprovalReports
  // --------------------------------------------------------------------------
  describe("getPendingApprovalReports", () => {
    it("should return pending reports with status 200", async () => {
      const mockReports = [{ id: 1, status: "Pending Approval" }];
      mockGetAllReportsFilteredByStatus.mockResolvedValue(mockReports);

      await ReportControllers.getPendingApprovalReports(
        mockReq,
        mockRes,
        mockNext
      );

      expect(mockGetAllReportsFilteredByStatus).toHaveBeenCalledWith(
        "Pending Approval",
        true
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockReports);
    });

    it("should call next(error) if service throws", async () => {
      const error = new Error("DB Error");
      mockGetAllReportsFilteredByStatus.mockRejectedValue(error);
      await ReportControllers.getPendingApprovalReports(
        mockReq,
        mockRes,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: getCategories
  // --------------------------------------------------------------------------
  describe("getCategories", () => {
    it("should return all categories with status 200", async () => {
      const mockCategories = [
        { id: 1, name: "Roads" },
        { id: 2, name: "Lighting" },
      ];
      mockFindAllProblemsCategories.mockResolvedValue(mockCategories);

      await ReportControllers.getCategories(mockReq, mockRes, mockNext);

      expect(mockFindAllProblemsCategories).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCategories);
    });

    it("should call next(error) if repository throws", async () => {
      const error = new Error("Database connection failed");
      mockFindAllProblemsCategories.mockRejectedValue(error);

      await ReportControllers.getCategories(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: updateReportStatus
  // --------------------------------------------------------------------------
  describe("updateReportStatus", () => {
    const freshReport = { id: 10, status: "In Progress" };

    it("should update status to 'In Progress' and return 200", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { status: "In Progress" };

      mockUpdateReport.mockResolvedValue(true);
      mockGetReportById.mockResolvedValue(freshReport);

      await ReportControllers.updateReportStatus(mockReq, mockRes, mockNext);

      expect(mockUpdateReport).toHaveBeenCalledWith(10, {
        status: "In Progress",
      });
      expect(mockGetReportById).toHaveBeenCalledWith(10);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(freshReport);
    });

    it("should return 400 for invalid reportId", async () => {
      mockReq.params.reportId = "abc";
      await ReportControllers.updateReportStatus(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid report ID.",
      });
    });

    it("should return 400 for invalid status", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { status: "InvalidStatus" };

      await ReportControllers.updateReportStatus(mockReq, mockRes, mockNext);

      expect(mockUpdateReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Invalid status"),
        })
      );
    });

    it("should return 400 if status is missing", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = {};

      await ReportControllers.updateReportStatus(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("should call next(error) if service throws", async () => {
      mockReq.params.reportId = "10";
      mockReq.body = { status: "Resolved" };
      const error = new Error("Service Error");
      mockUpdateReport.mockRejectedValue(error);

      await ReportControllers.updateReportStatus(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
