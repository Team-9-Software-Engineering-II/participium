import { jest, describe, it, expect, beforeEach } from '@jest/globals';

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

jest.unstable_mockModule("../../../repositories/problem-category-repo.mjs", () => ({
    findProblemCategoryById: mockFindProblemCategoryById,
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
  findExternalMaintainerWithFewestReports: mockFindExternalMaintainerWithFewestReports,
}));

const mockFindCompanyById = jest.fn();
const mockFindCompaniesByCategoryId = jest.fn();

jest.unstable_mockModule("../../../repositories/company-repo.mjs", () => ({
  findCompanyById: mockFindCompanyById,
  findCompaniesByCategoryId: mockFindCompaniesByCategoryId,
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
    photos: ["link1.jpg"]
};

// Minimal report created by the repository (before hydration/sanitization)
const mockCreatedReport = { id: 10, title: 'Pothole', userId: 42, categoryId: 7 };

// Report retrieved after hydration (ready for sanitization)
const mockHydratedReport = { id: 10, title: 'Pothole', user: { name: 'John Doe' } };

// Expected final sanitized output
const mockSanitizedReport = { id: 10, title: 'Pothole', reporterName: 'John Doe' };


describe("ReportService (Unit)", () => {
    beforeEach(async () => {
        jest.clearAllMocks();

        // Import the module under test
        const ReportServiceModule = await import("../../../services/report-service.mjs");
        ReportService = ReportServiceModule.ReportService;

        // Default mock behavior for sanitization
        mockSanitizeReport.mockReturnValue(mockSanitizedReport);
        mockSanitizeReports.mockImplementation(reports => reports.map(() => mockSanitizedReport));

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ 
                    display_name: "Via Roma 10, Torino", // Indirizzo finto
                    address: { road: "Via Roma", house_number: "10" }
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
            const result = await ReportService.createCitizenReport(userId, mockPayload);

            // 1. Verify Category Check
            expect(mockFindProblemCategoryById).toHaveBeenCalledWith(mockPayload.categoryId);

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

            await expect(ReportService.createCitizenReport(42, mockPayload))
                .rejects.toHaveProperty("statusCode", 404);

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

            await expect(ReportService.createCitizenReport(42, mockPayload))
                .rejects.toThrow("Database Write Error");
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

            expect(mockFindReportsByTechnicalOfficerId).toHaveBeenCalledWith(officerId);
            expect(mockSanitizeReports).toHaveBeenCalledWith(mockRawReports);
            expect(result).toEqual([mockSanitizedReport, mockSanitizedReport]);
        });

        it("should return empty array when no reports are assigned to the officer", async () => {
            mockFindReportsByTechnicalOfficerId.mockResolvedValue([]);
            mockSanitizeReports.mockReturnValue([]);

            const result = await ReportService.getReportsAssignedToOfficer(officerId);

            expect(mockFindReportsByTechnicalOfficerId).toHaveBeenCalledWith(officerId);
            expect(mockSanitizeReports).toHaveBeenCalledWith([]);
            expect(result).toEqual([]);
        });
    });

    describe("assignReportToExternalMaintainer", () => {
        const reportId = 10;
        const companyId = 5;

        const mockReportAssigned = { id: reportId, status: "Assigned", categoryId: 1 };
        const mockCompany = { id: companyId, name: "Enel X" };
        const mockMaintainer = { id: 100, firstName: "Luigi" };
        const mockUpdatedReport = { ...mockReportAssigned, externalMaintainerId: 100 };

        it("should successfully assign report to the best maintainer", async () => {
        mockFindReportById.mockResolvedValue(mockReportAssigned);
        const { findCompanyById } = await import("../../../repositories/company-repo.mjs");
        findCompanyById.mockResolvedValue(mockCompany);

        const { findExternalMaintainerWithFewestReports } = await import("../../../repositories/user-repo.mjs");
        findExternalMaintainerWithFewestReports.mockResolvedValue(mockMaintainer);

        mockUpdateReport.mockResolvedValue([1]);

        const result = await ReportService.assignReportToExternalMaintainer(reportId, companyId);

        expect(findExternalMaintainerWithFewestReports).toHaveBeenCalledWith(companyId);
        expect(mockUpdateReport).toHaveBeenCalledWith(reportId, { externalMaintainerId: 100 });
        expect(result).toBeDefined();
        });

        it("should throw 404 if report not found", async () => {
        mockFindReportById.mockResolvedValue(null);
        await expect(ReportService.assignReportToExternalMaintainer(999, companyId))
            .rejects.toHaveProperty("statusCode", 404);
        });

        it("should throw 400 if report status is invalid (e.g. Pending Approval)", async () => {
        const pendingReport = { ...mockReportAssigned, status: "Pending Approval" };
        mockFindReportById.mockResolvedValue(pendingReport);
        
        const { findCompanyById } = await import("../../../repositories/company-repo.mjs");
        findCompanyById.mockResolvedValue(mockCompany);

        await expect(ReportService.assignReportToExternalMaintainer(reportId, companyId))
            .rejects.toThrow("Cannot assign report to external maintainer");
        });

        it("should throw 404 if company not found", async () => {
        mockFindReportById.mockResolvedValue(mockReportAssigned);
        
        const { findCompanyById } = await import("../../../repositories/company-repo.mjs");
        findCompanyById.mockResolvedValue(null);

        await expect(ReportService.assignReportToExternalMaintainer(reportId, 999))
            .rejects.toThrow('Company with id "999" not found.');
        });

        it("should throw 409 if no maintainers are found in company", async () => {
        mockFindReportById.mockResolvedValue(mockReportAssigned);
        const { findCompanyById } = await import("../../../repositories/company-repo.mjs");
        findCompanyById.mockResolvedValue(mockCompany);
        
        const { findExternalMaintainerWithFewestReports } = await import("../../../repositories/user-repo.mjs");
        findExternalMaintainerWithFewestReports.mockResolvedValue(null);

        await expect(ReportService.assignReportToExternalMaintainer(reportId, companyId))
            .rejects.toHaveProperty("statusCode", 409);
        });
    });
});