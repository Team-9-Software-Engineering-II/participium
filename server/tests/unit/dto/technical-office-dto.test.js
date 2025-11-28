import { jest, describe, it, expect, beforeAll } from '@jest/globals';

// Import the DTO function directly (no mocking needed as it's a pure function)
let filterToSimplifiedList;

describe("Technical Office DTO (Unit)", () => {
    beforeAll(async () => {
        const dtoModule = await import("../../../shared/dto/technical-office-dto.mjs");
        filterToSimplifiedList = dtoModule.filterToSimplifiedList;
    });

    // ----------------------------------------------------------------------
    // filterToSimplifiedList
    // ----------------------------------------------------------------------
    describe("filterToSimplifiedList", () => {
        it("should transform array of technical offices to simplified list with only id and name", () => {
            const offices = [
                { 
                    id: 1, 
                    name: "Lighting Office",
                    category: { id: 1, name: "Lighting" },
                    users: [{ id: 10, username: "officer1" }],
                    otherField: "should be ignored"
                },
                { 
                    id: 2, 
                    name: "Road Maintenance Office",
                    category: { id: 2, name: "Roads" },
                    users: [{ id: 11, username: "officer2" }]
                }
            ];

            const result = filterToSimplifiedList(offices);

            expect(result).toEqual([
                { id: 1, name: "Lighting Office" },
                { id: 2, name: "Road Maintenance Office" }
            ]);
        });

        it("should return empty array when input is empty array", () => {
            const result = filterToSimplifiedList([]);
            expect(result).toEqual([]);
        });

        it("should return empty array when input is null", () => {
            const result = filterToSimplifiedList(null);
            expect(result).toEqual([]);
        });

        it("should return empty array when input is undefined", () => {
            const result = filterToSimplifiedList(undefined);
            expect(result).toEqual([]);
        });

        it("should return empty array when input is not an array", () => {
            const result = filterToSimplifiedList({ id: 1, name: "Office" });
            expect(result).toEqual([]);
        });

        it("should return empty array when input is a string", () => {
            const result = filterToSimplifiedList("not an array");
            expect(result).toEqual([]);
        });

        it("should handle single office object", () => {
            const offices = [
                { 
                    id: 1, 
                    name: "Single Office",
                    category: { id: 1 },
                    users: []
                }
            ];

            const result = filterToSimplifiedList(offices);

            expect(result).toEqual([
                { id: 1, name: "Single Office" }
            ]);
        });

        it("should handle offices with missing optional fields", () => {
            const offices = [
                { id: 1, name: "Office 1" },
                { id: 2, name: "Office 2", category: null },
                { id: 3, name: "Office 3", users: undefined }
            ];

            const result = filterToSimplifiedList(offices);

            expect(result).toEqual([
                { id: 1, name: "Office 1" },
                { id: 2, name: "Office 2" },
                { id: 3, name: "Office 3" }
            ]);
        });
    });
});

