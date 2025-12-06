import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- MOCKING REPORT SERVICE DEPENDENCIES ---

// Mocking the Report Repository functions
const mockCreateReport = jest.fn();
const mockFindAllReports = jest.fn();
const mockFindReportById = jest.fn();
const mockFindReportsByUserId = jest.fn();
const mockfindAllReportsFilteredByStatus = jest.fn();
const mockFindReportsByTechnicalOfficerId = jest.fn();
const mockUpdateReport = jest.fn();

jest.unstable_mockModule("../../../repositories/report-repo.mjs", () => ({
  createReport: mockCreateReport,
  findAllReports: mockFindAllReports,
  findReportById: mockFindReportById,
  findReportsByUserId: mockFindReportsByUserId,
  findAllReportsFilteredByStatus: mockfindAllReportsFilteredByStatus,
  findReportsByTechnicalOfficerId: mockFindReportsByTechnicalOfficerId,
  updateReport: mockUpdateReport,
}));

// Mocking the Problem Category Repository function
const mockFindProblemCategoryById = jest.fn();

jest.unstable_mockModule(
  "../../../repositories/problem-category-repo.mjs",
  () => ({
    findProblemCategoryById: mockFindProblemCategoryById,
  })
);

// Mocking the Company Repository functions
const mockFindCompaniesByCategoryId = jest.fn();
const mockFindCompanyById = jest.fn();

jest.unstable_mockModule("../../../repositories/company-repo.mjs", () => ({
  findCompaniesByCategoryId: mockFindCompaniesByCategoryId,
  findCompanyById: mockFindCompanyById,
}));

// Mocking the Utility functions (sanitize)
const mockSanitizeReport = jest.fn();
const mockSanitizeReports = jest.fn();

jest.unstable_mockModule("../../../shared/utils/report-utils.mjs", () => ({
  sanitizeReport: mockSanitizeReport,
  sanitizeReports: mockSanitizeReports,
}));

const mockFindStaffWithFewestReports = jest.fn();
const mockFindExternalMaintainerWithFewestReports = jest.fn();

jest.unstable_mockModule("../../../repositories/user-repo.mjs", () => ({
  findStaffWithFewestReports: mockFindStaffWithFewestReports,
  findExternalMaintainerWithFewestReports:
    mockFindExternalMaintainerWithFewestReports,
}));

const mockFindCompanyById = jest.fn();
const mockFindCompaniesByCategoryId = jest.fn();

jest.unstable_mockModule("../../../repositories/company-repo.mjs", () => ({
  findCompanyById: mockFindCompanyById,
  findCompaniesByCategoryId: mockFindCompaniesByCategoryId,
}));

const mockMapReportsCollectionToAssignedListDTO = jest.fn();

jest.unstable_mockModule("../../../shared/dto/report-dto.mjs", () => ({
  mapReportsCollectionToAssignedListDTO:
    mockMapReportsCollectionToAssignedListDTO,
}));

// Dynamic import of the Report Service
let ReportService;

// --- COMMON MOCK DATA ---
const mockPayload = {
  title: "Pothole",
  description: "Big hole",
  latitude: 10,
  longitude: 20,
  anonymous: false,
  categoryId: 7,
  photos: ["link1.jpg"],
};

// Minimal report created by the repository (before hydration/sanitization)
const mockCreatedReport = {
  id: 10,
  title: "Pothole",
  userId: 42,
  categoryId: 7,
};

// Report retrieved after hydration (ready for sanitization)
const mockHydratedReport = {
  id: 10,
  title: "Pothole",
  user: { name: "John Doe" },
};

// Expected final sanitized output
const mockSanitizedReport = {
  id: 10,
  title: "Pothole",
  reporterName: "John Doe",
};

describe("ReportService (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Import the module under test
    const ReportServiceModule = await import(
      "../../../services/report-service.mjs"
    );
    ReportService = ReportServiceModule.ReportService;

    // Default mock behavior for sanitization
    mockSanitizeReport.mockReturnValue(mockSanitizedReport);
    mockSanitizeReports.mockImplementation((reports) =>
      reports.map(() => mockSanitizedReport)
    );

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            display_name: "Via Roma 10, Torino", // Indirizzo finto
            address: { road: "Via Roma", house_number: "10" },
          }),
      })
    );
  });

  // ----------------------------------------------------------------------
  // createCitizenReport
  // ----------------------------------------------------------------------
  describe("createCitizenReport", () => {
    it("should successfully create a report, hydrate it, and return sanitized data", async () => {
      // Setup: Category exists, creation succeeds, hydration succeeds
      mockFindProblemCategoryById.mockResolvedValue({ id: 7 });
      mockCreateReport.mockResolvedValue(mockCreatedReport);
      mockFindReportById.mockResolvedValue(mockHydratedReport);

      const userId = 42;
      const result = await ReportService.createCitizenReport(
        userId,
        mockPayload
      );

      // 1. Verify Category Check
      expect(mockFindProblemCategoryById).toHaveBeenCalledWith(
        mockPayload.categoryId
      );

      // 2. Verify Report Creation
      expect(mockCreateReport).toHaveBeenCalledWith({
        title: mockPayload.title,
        description: mockPayload.description,
        status: "Pending Approval",
        rejection_reason: null,
        latitude: mockPayload.latitude,
        longitude: mockPayload.longitude,
        anonymous: mockPayload.anonymous,
        photosLinks: mockPayload.photos,
        userId: userId,
        categoryId: mockPayload.categoryId,
        address: "Via Roma 10",
      });

      // 3. Verify Hydration
      expect(mockFindReportById).toHaveBeenCalledWith(mockCreatedReport.id);

      // 4. Verify Sanitization
      expect(mockSanitizeReport).toHaveBeenCalledWith(mockHydratedReport);

      // 5. Verify Final Output
      expect(result).toEqual(mockSanitizedReport);
    });

    it("should throw a 404 error if the category does not exist", async () => {
      // Setup: Category check fails
      mockFindProblemCategoryById.mockResolvedValue(null);

      await expect(
        ReportService.createCitizenReport(42, mockPayload)
      ).rejects.toHaveProperty("statusCode", 404);

      // Verify that no further repository calls were made
      expect(mockCreateReport).not.toHaveBeenCalled();
      expect(mockFindReportById).not.toHaveBeenCalled();
    });

    it("should use the createdReport object if hydration fails (findReportById returns null)", async () => {
      // Setup: Category exists, creation succeeds, but hydration fails
      mockFindProblemCategoryById.mockResolvedValue({ id: 7 });
      mockCreateReport.mockResolvedValue(mockCreatedReport);
      mockFindReportById.mockResolvedValue(null); // Hydration fails

      await ReportService.createCitizenReport(42, mockPayload);

      // Verify that sanitization uses the created object as fallback
      expect(mockSanitizeReport).toHaveBeenCalledWith(mockCreatedReport);
    });

    it("should propagate errors if report creation fails", async () => {
      const repoError = new Error("Database Write Error");
      mockFindProblemCategoryById.mockResolvedValue({ id: 7 });
      mockCreateReport.mockRejectedValue(repoError);

      await expect(
        ReportService.createCitizenReport(42, mockPayload)
      ).rejects.toThrow("Database Write Error");
    });
  });

  // ----------------------------------------------------------------------
  // getAllReports
  // ----------------------------------------------------------------------
  describe("getAllReports", () => {
    const mockRawReports = [mockHydratedReport, mockHydratedReport];

    it("should call findAllReports and return sanitized results", async () => {
      mockFindAllReports.mockResolvedValue(mockRawReports);

      const result = await ReportService.getAllReports();

      expect(mockFindAllReports).toHaveBeenCalledTimes(1);
      expect(mockSanitizeReports).toHaveBeenCalledWith(mockRawReports);
      expect(result).toEqual([mockSanitizedReport, mockSanitizedReport]);
    });
  });

  // ----------------------------------------------------------------------
  // getReportById
  // ----------------------------------------------------------------------
  describe("getReportById", () => {
    const reportId = 5;

    it("should call findReportById and return sanitized result if found", async () => {
      mockFindReportById.mockResolvedValue(mockHydratedReport);

      const result = await ReportService.getReportById(reportId);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockSanitizeReport).toHaveBeenCalledWith(mockHydratedReport);
      expect(result).toEqual(mockSanitizedReport);
    });

    it("should call sanitizeReport with null and return sanitized null if not found", async () => {
      mockSanitizeReport.mockReturnValue(null);
      mockFindReportById.mockResolvedValue(null);

      const result = await ReportService.getReportById(reportId);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockSanitizeReport).toHaveBeenCalledWith(null);
      expect(result).toBeNull();
    });
  });

  // ----------------------------------------------------------------------
  // getReportsByUserId
  // ----------------------------------------------------------------------
  describe("getReportsByUserId", () => {
    const userId = 42;
    const mockRawReports = [mockHydratedReport];

    it("should call findReportsByUserId and return sanitized results", async () => {
      mockFindReportsByUserId.mockResolvedValue(mockRawReports);

      const result = await ReportService.getReportsByUserId(userId);

      expect(mockFindReportsByUserId).toHaveBeenCalledWith(userId);
      expect(mockSanitizeReports).toHaveBeenCalledWith(mockRawReports);
      expect(result).toEqual([mockSanitizedReport]);
    });
  });

  // ----------------------------------------------------------------------
  // getReportsAssignedToOfficer
  // ----------------------------------------------------------------------
  describe("getReportsAssignedToOfficer", () => {
    const officerId = 42;
    const mockRawReports = [mockHydratedReport, mockHydratedReport];

    it("should call findReportsByTechnicalOfficerId and return sanitized results", async () => {
      mockFindReportsByTechnicalOfficerId.mockResolvedValue(mockRawReports);

      const result = await ReportService.getReportsAssignedToOfficer(officerId);

      expect(mockFindReportsByTechnicalOfficerId).toHaveBeenCalledWith(
        officerId
      );
      expect(mockSanitizeReports).toHaveBeenCalledWith(mockRawReports);
      expect(result).toEqual([mockSanitizedReport, mockSanitizedReport]);
    });

    it("should return empty array when no reports are assigned to the officer", async () => {
      mockFindReportsByTechnicalOfficerId.mockResolvedValue([]);
      mockSanitizeReports.mockReturnValue([]);

      const result = await ReportService.getReportsAssignedToOfficer(officerId);

      expect(mockFindReportsByTechnicalOfficerId).toHaveBeenCalledWith(
        officerId
      );
      expect(mockSanitizeReports).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });

  // ----------------------------------------------------------------------
  // getEligibleCompaniesForReport
  // ----------------------------------------------------------------------
  describe("getEligibleCompaniesForReport", () => {
    const reportId = 10;
    const mockReport = {
      id: 10,
      title: "Pothole Report",
      categoryId: 5,
      status: "Assigned",
    };
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

    it("should return eligible companies when report exists", async () => {
      mockFindReportById.mockResolvedValue(mockReport);
      mockFindCompaniesByCategoryId.mockResolvedValue(mockCompanies);

      const result = await ReportService.getEligibleCompaniesForReport(
        reportId
      );

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindCompaniesByCategoryId).toHaveBeenCalledWith(
        mockReport.categoryId
      );
      expect(result).toEqual(mockCompanies);
    });

    it("should return empty array when no companies are eligible", async () => {
      mockFindReportById.mockResolvedValue(mockReport);
      mockFindCompaniesByCategoryId.mockResolvedValue([]);

      const result = await ReportService.getEligibleCompaniesForReport(
        reportId
      );

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindCompaniesByCategoryId).toHaveBeenCalledWith(
        mockReport.categoryId
      );
      expect(result).toEqual([]);
    });

    it("should throw 404 error when report does not exist", async () => {
      mockFindReportById.mockResolvedValue(null);

      await expect(
        ReportService.getEligibleCompaniesForReport(reportId)
      ).rejects.toMatchObject({
        message: "Report not found.",
        statusCode: 404,
      });

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindCompaniesByCategoryId).not.toHaveBeenCalled();
    });

    it("should propagate errors from findReportById", async () => {
      const repoError = new Error("Database connection error");
      mockFindReportById.mockRejectedValue(repoError);

      await expect(
        ReportService.getEligibleCompaniesForReport(reportId)
      ).rejects.toThrow("Database connection error");

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindCompaniesByCategoryId).not.toHaveBeenCalled();
    });

    it("should propagate errors from findCompaniesByCategoryId", async () => {
      const repoError = new Error("Category lookup failed");
      mockFindReportById.mockResolvedValue(mockReport);
      mockFindCompaniesByCategoryId.mockRejectedValue(repoError);

      await expect(
        ReportService.getEligibleCompaniesForReport(reportId)
      ).rejects.toThrow("Category lookup failed");

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindCompaniesByCategoryId).toHaveBeenCalledWith(
        mockReport.categoryId
      );
    });

    it("should handle report with different categoryId correctly", async () => {
      const reportWithDifferentCategory = {
        id: 20,
        title: "Another Report",
        categoryId: 8,
        status: "In Progress",
      };
      const companiesForCategory8 = [
        {
          id: 3,
          name: "Company C",
          address: "Via Torino 3",
          region: "Piemonte",
          country: "Italy",
        },
      ];
      mockFindReportById.mockResolvedValue(reportWithDifferentCategory);
      mockFindCompaniesByCategoryId.mockResolvedValue(companiesForCategory8);

      const result = await ReportService.getEligibleCompaniesForReport(20);

      expect(mockFindReportById).toHaveBeenCalledWith(20);
      expect(mockFindCompaniesByCategoryId).toHaveBeenCalledWith(8);
      expect(result).toEqual(companiesForCategory8);
    });
  });

  describe("assignReportToExternalMaintainer", () => {
    const reportId = 10;
    const companyId = 5;

    const mockReportAssigned = {
      id: reportId,
      status: "Assigned",
      categoryId: 1,
    };
    const mockCompany = { id: companyId, name: "Enel X" };
    const mockMaintainer = { id: 100, firstName: "Luigi" };
    const mockUpdatedReport = {
      ...mockReportAssigned,
      externalMaintainerId: 100,
    };

    it("should successfully assign report to the best maintainer", async () => {
      mockFindReportById.mockResolvedValue(mockReportAssigned);
      const { findCompanyById } = await import(
        "../../../repositories/company-repo.mjs"
      );
      findCompanyById.mockResolvedValue(mockCompany);

      const { findExternalMaintainerWithFewestReports } = await import(
        "../../../repositories/user-repo.mjs"
      );
      findExternalMaintainerWithFewestReports.mockResolvedValue(mockMaintainer);

      mockUpdateReport.mockResolvedValue([1]);

      const result = await ReportService.assignReportToExternalMaintainer(
        reportId,
        companyId
      );

      expect(findExternalMaintainerWithFewestReports).toHaveBeenCalledWith(
        companyId
      );
      expect(mockUpdateReport).toHaveBeenCalledWith(reportId, {
        externalMaintainerId: 100,
      });
      expect(result).toBeDefined();
    });

    it("should throw 404 if report not found", async () => {
      mockFindReportById.mockResolvedValue(null);
      await expect(
        ReportService.assignReportToExternalMaintainer(999, companyId)
      ).rejects.toHaveProperty("statusCode", 404);
    });

    it("should throw 400 if report status is invalid (e.g. Pending Approval)", async () => {
      const pendingReport = {
        ...mockReportAssigned,
        status: "Pending Approval",
      };
      mockFindReportById.mockResolvedValue(pendingReport);

      const { findCompanyById } = await import(
        "../../../repositories/company-repo.mjs"
      );
      findCompanyById.mockResolvedValue(mockCompany);

      await expect(
        ReportService.assignReportToExternalMaintainer(reportId, companyId)
      ).rejects.toThrow("Cannot assign report to external maintainer");
    });

    it("should throw 404 if company not found", async () => {
      mockFindReportById.mockResolvedValue(mockReportAssigned);

      const { findCompanyById } = await import(
        "../../../repositories/company-repo.mjs"
      );
      findCompanyById.mockResolvedValue(null);

      await expect(
        ReportService.assignReportToExternalMaintainer(reportId, 999)
      ).rejects.toThrow('Company with id "999" not found.');
    });

    it("should throw 409 if no maintainers are found in company", async () => {
      mockFindReportById.mockResolvedValue(mockReportAssigned);
      const { findCompanyById } = await import(
        "../../../repositories/company-repo.mjs"
      );
      findCompanyById.mockResolvedValue(mockCompany);

      const { findExternalMaintainerWithFewestReports } = await import(
        "../../../repositories/user-repo.mjs"
      );
      findExternalMaintainerWithFewestReports.mockResolvedValue(null);

      await expect(
        ReportService.assignReportToExternalMaintainer(reportId, companyId)
      ).rejects.toHaveProperty("statusCode", 409);
    });
  });

  describe("acceptReport", () => {
    const reportId = 1;
    const categoryId = 5;
    const officeId = 10;

    const mockPendingReport = {
      id: reportId,
      status: "Pending Approval",
      categoryId: categoryId,
    };
    const mockCategory = {
      id: categoryId,
      technicalOffice: { id: officeId, name: "Roads Office" },
    };
    const mockStaff = { id: 99 };

    it("should successfully accept and assign report", async () => {
      // Setup
      mockFindReportById.mockResolvedValue(mockPendingReport);
      mockFindProblemCategoryById.mockResolvedValue(mockCategory);
      mockFindStaffWithFewestReports.mockResolvedValue(mockStaff);
      mockUpdateReport.mockResolvedValue([1]);

      await ReportService.acceptReport(reportId);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindProblemCategoryById).toHaveBeenCalledWith(categoryId);
      expect(mockFindStaffWithFewestReports).toHaveBeenCalledWith(officeId);
      expect(mockUpdateReport).toHaveBeenCalledWith(reportId, {
        status: "Assigned",
        technicalOfficerId: mockStaff.id,
      });
    });

    it("should throw 404 if report not found", async () => {
      mockFindReportById.mockResolvedValue(null);
      await expect(ReportService.acceptReport(999)).rejects.toHaveProperty(
        "statusCode",
        404
      );
    });

    it("should throw 400 if report status is not Pending Approval", async () => {
      mockFindReportById.mockResolvedValue({
        ...mockPendingReport,
        status: "Assigned",
      });
      await expect(ReportService.acceptReport(reportId)).rejects.toThrow(
        "Cannot accept report"
      );
    });

    it("should throw 500 if category has no technical office", async () => {
      mockFindReportById.mockResolvedValue(mockPendingReport);
      mockFindProblemCategoryById.mockResolvedValue({
        id: categoryId,
        technicalOffice: null,
      });

      await expect(ReportService.acceptReport(reportId)).rejects.toHaveProperty(
        "statusCode",
        500
      );
    });

    it("should throw 409 if no staff is available", async () => {
      mockFindReportById.mockResolvedValue(mockPendingReport);
      mockFindProblemCategoryById.mockResolvedValue(mockCategory);
      mockFindStaffWithFewestReports.mockResolvedValue(null);

      await expect(ReportService.acceptReport(reportId)).rejects.toHaveProperty(
        "statusCode",
        409
      );
    });
  });

  describe("rejectReport", () => {
    const reportId = 1;
    const reason = "Not valid";
    const mockPendingReport = { id: reportId, status: "Pending Approval" };

    it("should successfully reject report", async () => {
      mockFindReportById.mockResolvedValue(mockPendingReport);
      mockUpdateReport.mockResolvedValue([1]);

      await ReportService.rejectReport(reportId, reason);

      expect(mockUpdateReport).toHaveBeenCalledWith(reportId, {
        status: "Rejected",
        rejection_reason: reason,
      });
    });

    it("should throw 404 if report not found", async () => {
      mockFindReportById.mockResolvedValue(null);
      await expect(
        ReportService.rejectReport(999, reason)
      ).rejects.toHaveProperty("statusCode", 404);
    });

    it("should throw 400 if report status is not Pending Approval", async () => {
      mockFindReportById.mockResolvedValue({ id: 1, status: "Assigned" });
      await expect(
        ReportService.rejectReport(reportId, reason)
      ).rejects.toThrow("Cannot reject report");
    });
  });

  describe("getAllReportsFilteredByStatus", () => {
    const status = "Pending Approval";
    const includeUser = true;

    // Dati simulati
    const mockRawReports = [
      { id: 1, status: "Pending Approval", user: { id: 1 } },
    ];
    const mockMappedReports = [
      { id: 1, status: "Pending Approval", reporterName: "Mario" },
    ];

    it("should return filtered reports mapped to DTO", async () => {
      // Setup
      // Nota: Verifica se nel tuo file il mock si chiama 'mockFindAllReportsFilteredByStatus'
      // o 'mockfindAllReportsFilteredByStatus' (con la f minuscola, come nel tuo copia-incolla precedente)
      mockfindAllReportsFilteredByStatus.mockResolvedValue(mockRawReports);
      mockMapReportsCollectionToAssignedListDTO.mockReturnValue(
        mockMappedReports
      );

      // Esecuzione
      const result = await ReportService.getAllReportsFilteredByStatus(
        status,
        includeUser
      );

      // Verifiche
      expect(mockfindAllReportsFilteredByStatus).toHaveBeenCalledWith(status);
      expect(mockMapReportsCollectionToAssignedListDTO).toHaveBeenCalledWith(
        mockRawReports,
        includeUser
      );
      expect(result).toEqual(mockMappedReports);
    });

    it("should use default false for includeUser if not provided", async () => {
      mockfindAllReportsFilteredByStatus.mockResolvedValue(mockRawReports);
      mockMapReportsCollectionToAssignedListDTO.mockReturnValue(
        mockMappedReports
      );

      await ReportService.getAllReportsFilteredByStatus(status);

      // Verifica che il secondo parametro sia false (default)
      expect(mockMapReportsCollectionToAssignedListDTO).toHaveBeenCalledWith(
        mockRawReports,
        false
      );
    });
  });

  describe("updateReport", () => {
    const reportId = 1;
    const payload = { status: "Resolved" };
    const mockReport = { id: reportId };

    it("should update report if it exists", async () => {
      // Setup: Report trovato
      mockFindReportById.mockResolvedValue(mockReport);
      mockUpdateReport.mockResolvedValue([1]);

      const result = await ReportService.updateReport(reportId, payload);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockUpdateReport).toHaveBeenCalledWith(reportId, payload);
      expect(result).toEqual([1]);
    });

    it("should throw 404 if report does not exist", async () => {
      // Setup: Report non trovato
      mockFindReportById.mockResolvedValue(null);

      await expect(
        ReportService.updateReport(reportId, payload)
      ).rejects.toHaveProperty("statusCode", 404);

      expect(mockUpdateReport).not.toHaveBeenCalled();
    });
  });

  describe("updateReportCategory", () => {
    const reportId = 1;
    const categoryId = 5;
    const payload = { categoryId: categoryId };
    const mockReport = { id: reportId };
    const mockCategory = { id: categoryId, name: "Waste" };

    it("should update report category if both report and category exist", async () => {
      // Setup: Tutto esiste
      mockFindReportById.mockResolvedValue(mockReport);
      mockFindProblemCategoryById.mockResolvedValue(mockCategory);
      mockUpdateReport.mockResolvedValue([1]);

      const result = await ReportService.updateReportCategory(
        reportId,
        payload
      );

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindProblemCategoryById).toHaveBeenCalledWith(categoryId);
      expect(mockUpdateReport).toHaveBeenCalledWith(reportId, payload);
      expect(result).toEqual([1]);
    });

    it("should throw 404 if report does not exist", async () => {
      // Setup: Report manca
      mockFindReportById.mockResolvedValue(null);

      await expect(
        ReportService.updateReportCategory(reportId, payload)
      ).rejects.toHaveProperty("statusCode", 404);

      // Verifica che si fermi prima di cercare la categoria
      expect(mockFindProblemCategoryById).not.toHaveBeenCalled();
    });

    it("should throw 404 if category does not exist", async () => {
      // Setup: Report c'è, ma Categoria manca
      mockFindReportById.mockResolvedValue(mockReport);
      mockFindProblemCategoryById.mockResolvedValue(null);

      await expect(
        ReportService.updateReportCategory(reportId, payload)
      ).rejects.toThrow('Category with id "5" not found.');

      expect(mockUpdateReport).not.toHaveBeenCalled();
    });
  });
});
