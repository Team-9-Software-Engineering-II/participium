import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- 1. MOCK DEI MODELLI SEQUELIZE ---
// Mock per il modello Company
const mockCompanyModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

// Mock per i modelli associati (User e Category)
// Servono perché vengono usati negli 'include' o come riferimenti
const mockUserModel = {};
const mockCategoryModel = {}; 

// Mock dell'oggetto DB principale
const mockDb = {
  Company: mockCompanyModel,
  User: mockUserModel,
  Category: mockCategoryModel, // Importante: corrisponde a db.Category nel tuo codice
};

// --- 2. MOCK DEL MODULO MODELS ---
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

let CompanyRepo;

describe("Company Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import dinamico del repository per usare i mock freschi ad ogni test
    CompanyRepo = await import("../../../repositories/company-repo.mjs");
  });

  // Dati di test comuni
  const mockCompanyData = { name: "Enel X", address: "Via Roma 1" };
  const mockCompanyInstance = { 
    id: 1, 
    ...mockCompanyData,
    // Mockiamo i metodi di istanza per le associazioni N:M (add/remove)
    addCategory: jest.fn(),
    removeCategory: jest.fn()
  };

  // --------------------------------------------------------------------------
  // TEST: findCompaniesByCategoryId (IL TUO TASK)
  // --------------------------------------------------------------------------
  describe("findCompaniesByCategoryId", () => {
    it("should find companies filtering by category association", async () => {
      const categoryId = 7;
      const companiesList = [mockCompanyInstance];
      
      // Setup: findAll restituisce la lista
      mockCompanyModel.findAll.mockResolvedValue(companiesList);

      // Esecuzione
      const result = await CompanyRepo.findCompaniesByCategoryId(categoryId);

      // Verifica: Controlliamo che la query includa la clausola 'where' corretta
      expect(mockCompanyModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            model: mockDb.Category,
            as: "categories",
            where: { id: categoryId }, // <-- IL PUNTO CRUCIALE
            through: { attributes: [] }
          })
        ]),
        order: [["name", "ASC"]]
      }));
      
      expect(result).toEqual(companiesList);
    });

    it("should return empty array if no companies found for category", async () => {
      mockCompanyModel.findAll.mockResolvedValue([]);
      const result = await CompanyRepo.findCompaniesByCategoryId(99);
      expect(result).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Altri Test CRUD (Standard)
  // --------------------------------------------------------------------------

  describe("createCompany", () => {
    it("should call Company.create", async () => {
      mockCompanyModel.create.mockResolvedValue(mockCompanyInstance);
      const result = await CompanyRepo.createCompany(mockCompanyData);
      expect(mockCompanyModel.create).toHaveBeenCalledWith(mockCompanyData);
      expect(result).toEqual(mockCompanyInstance);
    });
  });

  describe("findAllCompanies", () => {
    it("should call Company.findAll", async () => {
      mockCompanyModel.findAll.mockResolvedValue([mockCompanyInstance]);
      const result = await CompanyRepo.findAllCompanies();
      expect(mockCompanyModel.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockCompanyInstance]);
    });
  });

  describe("findCompanyById", () => {
    it("should call Company.findByPk with includes", async () => {
      mockCompanyModel.findByPk.mockResolvedValue(mockCompanyInstance);
      const result = await CompanyRepo.findCompanyById(1);
      expect(mockCompanyModel.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(result).toEqual(mockCompanyInstance);
    });
  });

  describe("findCompanyByName", () => {
    it("should call Company.findOne with where clause", async () => {
      mockCompanyModel.findOne.mockResolvedValue(mockCompanyInstance);
      const result = await CompanyRepo.findCompanyByName("Enel X");
      expect(mockCompanyModel.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { name: "Enel X" }
      }));
      expect(result).toEqual(mockCompanyInstance);
    });
  });

  describe("updateCompany", () => {
    it("should return true if updated", async () => {
      mockCompanyModel.update.mockResolvedValue([1]);
      const result = await CompanyRepo.updateCompany(1, { name: "New" });
      expect(result).toBe(true);
    });
  });

  describe("deleteCompany", () => {
    it("should return result of destroy", async () => {
      mockCompanyModel.destroy.mockResolvedValue(1);
      const result = await CompanyRepo.deleteCompany(1);
      expect(result).toBe(1);
    });
  });

  describe("addCategoryToCompany", () => {
    it("should call addCategory on company instance", async () => {
      mockCompanyModel.findByPk.mockResolvedValue(mockCompanyInstance);
      await CompanyRepo.addCategoryToCompany(1, 5);
      expect(mockCompanyInstance.addCategory).toHaveBeenCalledWith(5);
    });

    it("should throw error if company not found", async () => {
      mockCompanyModel.findByPk.mockResolvedValue(null);

      await expect(CompanyRepo.addCategoryToCompany(99, 5))
        .rejects.toThrow("Company not found");
        
      expect(mockCompanyModel.findByPk).toHaveBeenCalledWith(99);
    });
  });

  describe("removeCategoryFromCompany", () => {
    it("should call removeCategory on company instance", async () => {
      mockCompanyModel.findByPk.mockResolvedValue(mockCompanyInstance);
      await CompanyRepo.removeCategoryFromCompany(1, 5);
      expect(mockCompanyInstance.removeCategory).toHaveBeenCalledWith(5);
    });

    it("should throw error if company not found", async () => {
      mockCompanyModel.findByPk.mockResolvedValue(null);

      await expect(CompanyRepo.removeCategoryFromCompany(99, 5))
        .rejects.toThrow("Company not found");

      expect(mockCompanyModel.findByPk).toHaveBeenCalledWith(99);
    });
  });
});