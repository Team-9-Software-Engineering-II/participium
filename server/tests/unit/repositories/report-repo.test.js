import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- MOCK SEQUELIZE MODELS AND DB CONNECTOR ---

const mockReportModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const mockUserModel = {};
const mockCategoryModel = {};
const mockTechnicalOfficeModel = {};

const mockDb = {
  Report: mockReportModel,
  User: mockUserModel,
  Category: mockCategoryModel,
  TechnicalOffice: mockTechnicalOfficeModel,
};

jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

let ReportRepo;

// --- COMMON MOCK DATA ---
const mockReportData = {
  title: "Pothole",
  description: "Test",
  userId: 42,
  categoryId: 1,
};
const mockSequelizeReport = { id: 1, ...mockReportData };

// --- DEFINIZIONE DEGLI INCLUDE ---

// 1. Include Base (User + Category)
// Usato da: findReportsByUserId, findReportsByCategoryId, findReportsByTechnicalOfficerId
const includeBasic = [
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

// 2. Include Esteso (User + Category + Officer + Maintainer)
// Usato da: findAllReports, findAllReportsFilteredByStatus
const includeExtended = [
  ...includeBasic,
  {
    model: mockDb.User,
    as: "technicalOfficer",
    attributes: ["id", "username", "firstName", "lastName", "email"],
  },
  {
    model: mockDb.User,
    as: "externalMaintainer",
    attributes: [
      "id",
      "username",
      "firstName",
      "lastName",
      "email",
      "companyId",
    ],
  },
];

// 3. Include per ID (Simile all'Esteso ma con TechnicalOffice dentro Category)
// Usato da: findReportById
const includeForId = [
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
  {
    model: mockDb.User,
    as: "externalMaintainer",
    attributes: [
      "id",
      "username",
      "firstName",
      "lastName",
      "email",
      "companyId",
    ],
  },
];

const orderDesc = [["createdAt", "DESC"]];

describe("Report Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    ReportRepo = await import("../../../repositories/report-repo.mjs");
  });

  describe("createReport", () => {
    it("should call Report.create", async () => {
      mockReportModel.create.mockResolvedValue(mockSequelizeReport);
      const result = await ReportRepo.createReport(mockReportData);
      expect(mockReportModel.create).toHaveBeenCalledWith(mockReportData);
      expect(result).toEqual(mockSequelizeReport);
    });
  });

  describe("findAllReports", () => {
    it("should call findAll with EXTENDED includes", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);
      await ReportRepo.findAllReports();
      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        include: includeExtended, // <-- Usa la versione estesa
        order: orderDesc,
      });
    });
  });

  describe("findAllReportsFilteredByStatus", () => {
    it("should call findAll with where status and EXTENDED includes", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);
      await ReportRepo.findAllReportsFilteredByStatus("Assigned");
      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        where: { status: "Assigned" },
        include: includeExtended, // <-- Usa la versione estesa
        order: orderDesc,
      });
    });
  });

  describe("findReportById", () => {
    it("should call findByPk with FULL ID includes", async () => {
      mockReportModel.findByPk.mockResolvedValue(mockSequelizeReport);
      await ReportRepo.findReportById(1);
      expect(mockReportModel.findByPk).toHaveBeenCalledWith(1, {
        include: includeForId, // <-- Usa la versione specifica per ID
      });
    });

    it("should return null if not found", async () => {
      mockReportModel.findByPk.mockResolvedValue(null);
      const result = await ReportRepo.findReportById(999);
      expect(result).toBeNull();
    });
  });

  describe("findReportsByUserId", () => {
    it("should call findAll with BASIC includes", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);
      await ReportRepo.findReportsByUserId(42);
      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        where: { userId: 42 },
        include: includeBasic, // <-- Usa la versione base (senza officer/maintainer)
        order: orderDesc,
      });
    });
  });

  describe("findReportsByCategoryId", () => {
    it("should call findAll with BASIC includes", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);
      await ReportRepo.findReportsByCategoryId(1);
      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        where: { categoryId: 1 },
        include: includeBasic, // <-- Usa la versione base
        order: orderDesc,
      });
    });
  });

  describe("findReportsByTechnicalOfficerId", () => {
    it("should call findAll with BASIC includes", async () => {
      mockReportModel.findAll.mockResolvedValue([mockSequelizeReport]);
      await ReportRepo.findReportsByTechnicalOfficerId(42);
      expect(mockReportModel.findAll).toHaveBeenCalledWith({
        where: { technicalOfficerId: 42 },
        include: includeBasic, // <-- Usa la versione base
        order: orderDesc,
      });
    });

    it("should return empty array if none found", async () => {
      mockReportModel.findAll.mockResolvedValue([]);
      const result = await ReportRepo.findReportsByTechnicalOfficerId(42);
      expect(result).toEqual([]);
    });
  });

  describe("updateReport", () => {
    it("should return true if updated", async () => {
      mockReportModel.update.mockResolvedValue([1]);
      const result = await ReportRepo.updateReport(1, { status: "OK" });
      expect(result).toBe(true);
    });

    it("should return false if not updated", async () => {
      mockReportModel.update.mockResolvedValue([0]);
      const result = await ReportRepo.updateReport(1, { status: "OK" });
      expect(result).toBe(false);
    });
  });

  describe("deleteReport", () => {
    it("should return true if deleted", async () => {
      mockReportModel.destroy.mockResolvedValue(1);
      const result = await ReportRepo.deleteReport(1);
      expect(result).toBe(true);
    });

    it("should return false if not deleted", async () => {
      mockReportModel.destroy.mockResolvedValue(0);
      const result = await ReportRepo.deleteReport(1);
      expect(result).toBe(false);
    });
  });
});