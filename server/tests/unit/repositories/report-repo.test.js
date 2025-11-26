import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- MOCK SEQUELIZE MODELS AND DB CONNECTOR ---

// 1. Mock the main functions of the Report model
const mockReportModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

// 2. Mock the associated models required for the 'include' option
const mockUserModel = {};
const mockCategoryModel = {};
const mockTechnicalOfficeModel = {};

// 3. Mock the DB object (index.mjs)
const mockDb = {
  Report: mockReportModel,
  User: mockUserModel,
  Category: mockCategoryModel,
  TechnicalOffice: mockTechnicalOfficeModel,
};

// 4. Dynamic mock of the DB module
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

// Dynamic import of the Repository
let ReportRepo;

// --- COMMON MOCK DATA ---
const mockReportData = {
  title: "Pothole",
  description: "Test",
  userId: 42,
  categoryId: 1,
};
const mockSequelizeReport = { id: 1, ...mockReportData };

const includeUserAndCategory = [
  {
    model: mockDb.User,
    as: "user",
    attributes: ["id", "username", "firstName", "lastName", "photoURL"],
  },
  {
    model: mockDb.Category,
    as: "category",
  },
];

const includeFull = [
  {
    model: mockDb.User,
    as: "user",
    attributes: ["id", "username", "firstName", "lastName", "photoURL"],
  },
  {
    model: mockDb.Category,
    as: "category",
    include: [
      {
        model: mockDb.TechnicalOffice,
        as: "technicalOffice",
        attributes: ["id", "name"],
      },
    ],
  },
  {
    model: mockDb.User,
    as: "technicalOfficer",
    attributes: ["id", "username", "firstName", "lastName", "email"],
  },
];

const orderDesc = [["createdAt", "DESC"]];

describe("Report Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import the repository after defining the mocks
    ReportRepo = await import("../../../repositories/report-repo.mjs");
  });

  // ----------------------------------------------------------------------
  // createReport
  // ----------------------------------------------------------------------
  describe("createReport", () => {
    it("should call Report.create with the provided data", async () => {
      mockReportModel.create.mockResolvedValue(mockSequelizeReport);

      const result = await ReportRepo.createReport(mockReportData);

      expect(mockReportModel.create).toHaveBeenCalledWith(mockReportData);
      expect(result).toEqual(mockSequelizeReport);
    });
  });

  // ----------------------------------------------------------------------
  // findAllReports
  // ----------------------------------------------------------------------
  describe("findAllReports", () => {
    it("should call Report.findAll with includes and DESC order", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);

      const result = await ReportRepo.findAllReports();

      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        include: includeUserAndCategory,
        order: orderDesc,
      });
      expect(result).toEqual([mockSequelizeReport]);
    });
  });

  // ----------------------------------------------------------------------
  // findReportById
  // ----------------------------------------------------------------------
  describe("findReportById", () => {
    const id = 1;
    it("should call Report.findByPk with ID and includes", async () => {
      mockReportModel.findByPk.mockResolvedValue(mockSequelizeReport);

      const result = await ReportRepo.findReportById(id);

      expect(mockReportModel.findByPk).toHaveBeenCalledWith(id, {
        include: includeFull,
      });
      expect(result).toEqual(mockSequelizeReport);
    });

    it("should return null if the report is not found", async () => {
      mockReportModel.findByPk.mockResolvedValue(null);
      const result = await ReportRepo.findReportById(999);
      expect(result).toBeNull();
    });
  });

  // ----------------------------------------------------------------------
  // findReportsByUserId
  // ----------------------------------------------------------------------
  describe("findReportsByUserId", () => {
    const userId = 42;
    it("should call Report.findAll filtered by userId with includes and DESC order", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);

      const result = await ReportRepo.findReportsByUserId(userId);

      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        where: { userId },
        include: includeUserAndCategory,
        order: orderDesc,
      });
      expect(result).toEqual([mockSequelizeReport]);
    });
  });

  // ----------------------------------------------------------------------
  // findReportsByCategoryId
  // ----------------------------------------------------------------------
  describe("findReportsByCategoryId", () => {
    const categoryId = 7;
    it("should call Report.findAll filtered by categoryId with includes and DESC order", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);

      const result = await ReportRepo.findReportsByCategoryId(categoryId);

      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        where: { categoryId },
        include: includeUserAndCategory,
        order: orderDesc,
      });
      expect(result).toEqual([mockSequelizeReport]);
    });
  });

  // ----------------------------------------------------------------------
  // updateReport
  // ----------------------------------------------------------------------
  describe("updateReport", () => {
    const updateData = { status: "In Progress" };
    const id = 1;

    it("should return true if one row was updated", async () => {
      // Sequelize returns [number of updated rows]
      mockReportModel.update.mockResolvedValue([1]);
      const result = await ReportRepo.updateReport(id, updateData);

      expect(mockReportModel.update).toHaveBeenCalledWith(updateData, {
        where: { id },
      });
      expect(result).toBe(true);
    });

    it("should return false if no row was updated", async () => {
      mockReportModel.update.mockResolvedValue([0]);
      const result = await ReportRepo.updateReport(999, updateData);
      expect(result).toBe(false);
    });
  });

  // ----------------------------------------------------------------------
  // deleteReport
  // ----------------------------------------------------------------------
  describe("deleteReport", () => {
    const id = 1;

    it("should return true if one row was deleted", async () => {
      // Sequelize returns the number of deleted rows
      mockReportModel.destroy.mockResolvedValue(1);
      const result = await ReportRepo.deleteReport(id);

      expect(mockReportModel.destroy).toHaveBeenCalledWith({ where: { id } });
      expect(result).toBe(true);
    });

    it("should return false if no row was deleted", async () => {
      mockReportModel.destroy.mockResolvedValue(0);
      const result = await ReportRepo.deleteReport(999);
      expect(result).toBe(false);
    });
  });

  // ----------------------------------------------------------------------
  // findReportsByTechnicalOfficerId
  // ----------------------------------------------------------------------
  describe("findReportsByTechnicalOfficerId", () => {
    const officerId = 42;
    it("should call Report.findAll filtered by technicalOfficerId with includes and DESC order", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);

      const result = await ReportRepo.findReportsByTechnicalOfficerId(
        officerId
      );

      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        where: { technicalOfficerId: officerId },
        include: includeUserAndCategory,
        order: orderDesc,
      });
      expect(result).toEqual([mockSequelizeReport]);
    });

    it("should return empty array when no reports are assigned to the officer", async () => {
      mockReportModel.findAll.mockResolvedValue([]);
      const result = await ReportRepo.findReportsByTechnicalOfficerId(
        officerId
      );
      expect(result).toEqual([]);
    });
  });
});
