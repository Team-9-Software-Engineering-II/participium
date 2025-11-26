import { validateCreateReportInput, validateReportToBeAcceptedOrRejected, validateNewReportCategory } from "../../../shared/validators/report-validator.mjs";
import httpMocks from "node-mocks-http";
import { REPORT } from "../../../shared/constants/models.mjs";

describe("Report Validators", () => {
  describe("validateCreateReportInput", () => {
    it("should return sanitized payload if valid", () => {
      const req = httpMocks.createRequest({
        body: {
          title: "Test",
          description: "Desc",
          categoryId: 1,
          latitude: 45,
          longitude: 9,
          anonymous: false,
          photos: ["photo1.jpg"],
        },
      });
      const res = httpMocks.createResponse();

      const result = validateCreateReportInput(req, res);
      expect(result).toEqual({
        title: "Test",
        description: "Desc",
        categoryId: 1,
        latitude: 45,
        longitude: 9,
        anonymous: false,
        photos: ["photo1.jpg"],
      });
    });

    it("should respond with 400 if required fields are missing or invalid", () => {
      const req = httpMocks.createRequest({ body: { title: "", description: "", categoryId: -1, latitude: 200, longitude: 200, photos: "notarray", anonymous: "yes" } });
      const res = httpMocks.createResponse();

      const result = validateCreateReportInput(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty("errors");
      expect(result).toBeNull();
    });

    it("should validate photos array length and content", () => {
      const req = httpMocks.createRequest({
        body: { title: "T", description: "D", categoryId: 1, latitude: 0, longitude: 0, photos: ["", "  ", null] },
      });
      const res = httpMocks.createResponse();
      const result = validateCreateReportInput(req, res);
      expect(res.statusCode).toBe(400);
      expect(result).toBeNull();
    });
  });

  describe("validateReportToBeAcceptedOrRejected", () => {
    it("should return validated report for ASSIGNED status", () => {
      const input = { status: REPORT.STATUS.ASSIGNED };
      const result = validateReportToBeAcceptedOrRejected(input);
      expect(result.status).toBe(REPORT.STATUS.ASSIGNED);
      expect(result.rejection_reason).toBeUndefined();
    });

    it("should throw 400 if status is invalid", () => {
      expect(() => validateReportToBeAcceptedOrRejected({ status: "INVALID" })).toThrow(/Invalid status provided/);
    });

    it("should throw if REJECTED status has no rejection_reason", () => {
      expect(() => validateReportToBeAcceptedOrRejected({ status: REPORT.STATUS.REJECTED })).toThrow(/Please provide a rejection reason/);
    });

    it("should throw if ASSIGNED status includes rejection_reason", () => {
      expect(() => validateReportToBeAcceptedOrRejected({ status: REPORT.STATUS.ASSIGNED, rejection_reason: "reason" })).toThrow(/Cannot provide a rejection reason/);
    });

    it("should validate REJECTED status with valid reason", () => {
      const input = { status: REPORT.STATUS.REJECTED, rejection_reason: "Not valid" };
      const result = validateReportToBeAcceptedOrRejected(input);
      expect(result.status).toBe(REPORT.STATUS.REJECTED);
      expect(result.rejection_reason).toBe("Not valid");
    });
  });

  describe("validateNewReportCategory", () => {
    it("should return validated categoryId if positive integer", async () => {
      const result = await validateNewReportCategory({ categoryId: 5 });
      expect(result.categoryId).toBe(5);
    });

    it("should throw 400 if categoryId is not a positive number", async () => {
      await expect(validateNewReportCategory({ categoryId: -3 })).rejects.toThrow(/Invalid ID format/);
    });

    it("should throw 400 if categoryId is missing", async () => {
      await expect(validateNewReportCategory({})).rejects.toThrow(/Invalid ID format/);
    });
  });
});
