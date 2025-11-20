import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- 1. MOCK DEL MODELLO SEQUELIZE ---
const mockTechnicalOfficeModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

// Mock dei modelli associati (necessari per verificare l'opzione 'include')
const mockCategoryModel = {};
const mockUserModel = {};

// Mock dell'oggetto DB
const mockDb = {
  TechnicalOffice: mockTechnicalOfficeModel,
  Category: mockCategoryModel,
  User: mockUserModel,
};

// Mock del modulo models
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

let TechnicalOfficeRepo;

// Opzioni di inclusione attese (copiate dalla logica del repo per verifica)
const expectedIncludeOptions = [
  { model: mockDb.Category, as: "category", required: false },
  {
    model: mockDb.User,
    as: "users",
    required: false,
    attributes: ["id", "username", "firstName", "lastName"],
  },
];

describe("Technical Office Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import dinamico del repo per usare i mock freschi
    TechnicalOfficeRepo = await import("../../../repositories/technical-office-repo.mjs");
  });

  // --------------------------------------------------------------------------
  // createTechnicalOffice
  // --------------------------------------------------------------------------
  describe("createTechnicalOffice", () => {
    it("should call TechnicalOffice.create with correct data", async () => {
      const officeData = { name: "Lighting" };
      const createdOffice = { id: 1, ...officeData };
      mockTechnicalOfficeModel.create.mockResolvedValue(createdOffice);

      const result = await TechnicalOfficeRepo.createTechnicalOffice(officeData);

      expect(mockTechnicalOfficeModel.create).toHaveBeenCalledWith(officeData);
      expect(result).toEqual(createdOffice);
    });
  });

  // --------------------------------------------------------------------------
  // findAllTechnicalOffices
  // --------------------------------------------------------------------------
  describe("findAllTechnicalOffices", () => {
    it("should call TechnicalOffice.findAll with correct includes", async () => {
      const offices = [{ id: 1, name: "Lighting" }];
      mockTechnicalOfficeModel.findAll.mockResolvedValue(offices);

      const result = await TechnicalOfficeRepo.findAllTechnicalOffices();

      expect(mockTechnicalOfficeModel.findAll).toHaveBeenCalledWith({
        include: expectedIncludeOptions,
      });
      expect(result).toEqual(offices);
    });
  });

  // --------------------------------------------------------------------------
  // findTechnicalOfficeById
  // --------------------------------------------------------------------------
  describe("findTechnicalOfficeById", () => {
    it("should call TechnicalOffice.findByPk with correct ID and includes", async () => {
      const office = { id: 1, name: "Lighting" };
      mockTechnicalOfficeModel.findByPk.mockResolvedValue(office);

      const result = await TechnicalOfficeRepo.findTechnicalOfficeById(1);

      expect(mockTechnicalOfficeModel.findByPk).toHaveBeenCalledWith(1, {
        include: expectedIncludeOptions,
      });
      expect(result).toEqual(office);
    });

    it("should return null if office not found", async () => {
      mockTechnicalOfficeModel.findByPk.mockResolvedValue(null);
      const result = await TechnicalOfficeRepo.findTechnicalOfficeById(999);
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // findTechnicalOfficeByName
  // --------------------------------------------------------------------------
  describe("findTechnicalOfficeByName", () => {
    it("should call TechnicalOffice.findOne with correct where clause and includes", async () => {
      const office = { id: 1, name: "Lighting" };
      mockTechnicalOfficeModel.findOne.mockResolvedValue(office);

      const result = await TechnicalOfficeRepo.findTechnicalOfficeByName("Lighting");

      expect(mockTechnicalOfficeModel.findOne).toHaveBeenCalledWith({
        where: { name: "Lighting" },
        include: expectedIncludeOptions,
      });
      expect(result).toEqual(office);
    });

    it("should return null if office name not found", async () => {
      mockTechnicalOfficeModel.findOne.mockResolvedValue(null);
      const result = await TechnicalOfficeRepo.findTechnicalOfficeByName("Nonexistent");
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // updateTechnicalOffice
  // --------------------------------------------------------------------------
  describe("updateTechnicalOffice", () => {
    const updateData = { name: "Public Lighting" };

    it("should return true if update affects at least 1 row", async () => {
      // Sequelize update restituisce [numero_righe_aggiornate]
      mockTechnicalOfficeModel.update.mockResolvedValue([1]);

      const result = await TechnicalOfficeRepo.updateTechnicalOffice(1, updateData);

      expect(mockTechnicalOfficeModel.update).toHaveBeenCalledWith(updateData, {
        where: { id: 1 },
      });
      expect(result).toBe(true);
    });

    it("should return false if no rows are updated", async () => {
      mockTechnicalOfficeModel.update.mockResolvedValue([0]);

      const result = await TechnicalOfficeRepo.updateTechnicalOffice(999, updateData);

      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // deleteTechnicalOffice
  // --------------------------------------------------------------------------
  describe("deleteTechnicalOffice", () => {
    it("should return true if delete affects at least 1 row", async () => {
      // Sequelize destroy restituisce il numero di righe cancellate (intero)
      mockTechnicalOfficeModel.destroy.mockResolvedValue(1);

      const result = await TechnicalOfficeRepo.deleteTechnicalOffice(1);

      expect(mockTechnicalOfficeModel.destroy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBe(true);
    });

    it("should return false if no rows are deleted", async () => {
      mockTechnicalOfficeModel.destroy.mockResolvedValue(0);

      const result = await TechnicalOfficeRepo.deleteTechnicalOffice(999);

      expect(result).toBe(false);
    });
  });
});