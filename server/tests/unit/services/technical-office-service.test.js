import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- MOCKING TECHNICAL OFFICE SERVICE DEPENDENCIES ---

// Mocking the Technical Office Repository function
const mockFindAllTechnicalOffices = jest.fn();

jest.unstable_mockModule("../../../repositories/technical-office-repo.mjs", () => ({
    findAllTechnicalOffices: mockFindAllTechnicalOffices,
}));

// Mocking the DTO function
const mockFilterToSimplifiedList = jest.fn();

jest.unstable_mockModule("../../../shared/dto/technical-office-dto.mjs", () => ({
    filterToSimplifiedList: mockFilterToSimplifiedList,
}));

// Dynamic import of the Technical Office Service
let TechnicalOfficeService;

// --- COMMON MOCK DATA ---
const mockRawOffices = [
    { 
        id: 1, 
        name: "Lighting Office",
        category: { id: 1, name: "Lighting" },
        users: [{ id: 10, username: "officer1" }]
    },
    { 
        id: 2, 
        name: "Road Maintenance Office",
        category: { id: 2, name: "Roads" },
        users: [{ id: 11, username: "officer2" }]
    }
];

const mockSimplifiedOffices = [
    { id: 1, name: "Lighting Office" },
    { id: 2, name: "Road Maintenance Office" }
];

describe("TechnicalOfficeService (Unit)", () => {
    beforeEach(async () => {
        jest.clearAllMocks();

        // Import the module under test
        const TechnicalOfficeServiceModule = await import("../../../services/technical-office-service.mjs");
        TechnicalOfficeService = TechnicalOfficeServiceModule.TechnicalOfficeService;

        // Default mock behavior for DTO
        mockFilterToSimplifiedList.mockReturnValue(mockSimplifiedOffices);
    });

    // ----------------------------------------------------------------------
    // getAllSimplifiedTechnicalOffices
    // ----------------------------------------------------------------------
    describe("getAllSimplifiedTechnicalOffices", () => {
        it("should call findAllTechnicalOffices and return simplified list", async () => {
            mockFindAllTechnicalOffices.mockResolvedValue(mockRawOffices);

            const result = await TechnicalOfficeService.getAllSimplifiedTechnicalOffices();

            // 1. Verify Repository Call
            expect(mockFindAllTechnicalOffices).toHaveBeenCalledTimes(1);

            // 2. Verify DTO Transformation
            expect(mockFilterToSimplifiedList).toHaveBeenCalledWith(mockRawOffices);

            // 3. Verify Final Output
            expect(result).toEqual(mockSimplifiedOffices);
        });

        it("should return empty array when no offices exist", async () => {
            mockFindAllTechnicalOffices.mockResolvedValue([]);
            mockFilterToSimplifiedList.mockReturnValue([]);

            const result = await TechnicalOfficeService.getAllSimplifiedTechnicalOffices();

            expect(mockFindAllTechnicalOffices).toHaveBeenCalledTimes(1);
            expect(mockFilterToSimplifiedList).toHaveBeenCalledWith([]);
            expect(result).toEqual([]);
        });

        it("should propagate errors if repository fails", async () => {
            const repoError = new Error("Database connection error");
            mockFindAllTechnicalOffices.mockRejectedValue(repoError);

            await expect(TechnicalOfficeService.getAllSimplifiedTechnicalOffices())
                .rejects.toThrow("Database connection error");

            expect(mockFilterToSimplifiedList).not.toHaveBeenCalled();
        });
    });
});

