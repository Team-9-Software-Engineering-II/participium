import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the Category model's primary methods
const mockCategoryModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

// Mock the TechnicalOffice model (needed for 'include' option)
const mockTechnicalOfficeModel = {};

// Mock the DB module (index.mjs)
const mockDb = {
  Category: mockCategoryModel,
  TechnicalOffice: mockTechnicalOfficeModel,
};

// Dynamically mock the DB module path (used by the repository)
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

let ProblemCategoryRepo;

describe("Problem Category Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    ProblemCategoryRepo = await import("../../../repositories/problem-category-repo.mjs");
  });

  // Define mock data for the repository tests
  const mockCategoryData = {
    name: "Roads",
    description: "Potholes and maintenance",
  };
  const mockCategoryFound = { id: 1, ...mockCategoryData };
  const includeOption = {
    include: { model: mockTechnicalOfficeModel, as: "technicalOffice" },
  };

  // --------------------------------------------------------------------------
  // createProblemCategory
  // --------------------------------------------------------------------------
  describe("createProblemCategory", () => {
    it("should call Category.create with the correct data", async () => {
      mockCategoryModel.create.mockResolvedValue(mockCategoryFound);

      const result = await ProblemCategoryRepo.createProblemCategory(mockCategoryData);

      expect(mockCategoryModel.create).toHaveBeenCalledWith(mockCategoryData);
      expect(result).toEqual(mockCategoryFound);
    });
  });

  // --------------------------------------------------------------------------
  // findAllProblemsCategories
  // --------------------------------------------------------------------------
  describe("findAllProblemsCategories", () => {
    it("should call Category.findAll including TechnicalOffice", async () => {
      const mockAllCategories = [mockCategoryFound, { id: 2, name: "Waste" }];
      mockCategoryModel.findAll.mockResolvedValue(mockAllCategories);

      const result = await ProblemCategoryRepo.findAllProblemsCategories();

      expect(mockCategoryModel.findAll).toHaveBeenCalledWith(includeOption);
      expect(result).toEqual(mockAllCategories);
    });
  });

  // --------------------------------------------------------------------------
  // findProblemCategoryById
  // --------------------------------------------------------------------------
  describe("findProblemCategoryById", () => {
    const categoryId = 1;

    it("should call Category.findByPk with the ID and include option", async () => {
      mockCategoryModel.findByPk.mockResolvedValue(mockCategoryFound);

      const result = await ProblemCategoryRepo.findProblemCategoryById(categoryId);

      expect(mockCategoryModel.findByPk).toHaveBeenCalledWith(categoryId, includeOption);
      expect(result).toEqual(mockCategoryFound);
    });

    it("should return null if category is not found by ID", async () => {
      mockCategoryModel.findByPk.mockResolvedValue(null);
      const result = await ProblemCategoryRepo.findProblemCategoryById(999);
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // findProblemCategoryByName
  // --------------------------------------------------------------------------
  describe("findProblemCategoryByName", () => {
    const categoryName = "Roads";

    it("should call Category.findOne with the name and include option", async () => {
      mockCategoryModel.findOne.mockResolvedValue(mockCategoryFound);
      const expectedOptions = {
        where: { name: categoryName },
        ...includeOption,
      };

      const result = await ProblemCategoryRepo.findProblemCategoryByName(categoryName);

      expect(mockCategoryModel.findOne).toHaveBeenCalledWith(expectedOptions);
      expect(result).toEqual(mockCategoryFound);
    });

    it("should return null if category is not found by name", async () => {
      mockCategoryModel.findOne.mockResolvedValue(null);
      const result = await ProblemCategoryRepo.findProblemCategoryByName("Nonexistent");
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // updateCategory
  // --------------------------------------------------------------------------
  describe("updateCategory", () => {
    const updateData = { description: "Updated description" };
    const categoryId = 1;

    it("should return true if one row was updated", async () => {
      mockCategoryModel.update.mockResolvedValue([1]);

      const result = await ProblemCategoryRepo.updateCategory(categoryId, updateData);

      expect(mockCategoryModel.update).toHaveBeenCalledWith(updateData, {
        where: { id: categoryId },
      });
      expect(result).toBe(true);
    });

    it("should return false if no row was updated", async () => {
      mockCategoryModel.update.mockResolvedValue([0]);

      const result = await ProblemCategoryRepo.updateCategory(999, updateData);

      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // deleteCategory
  // --------------------------------------------------------------------------
  describe("deleteCategory", () => {
    const categoryId = 1;

    it("should return true if one row was deleted", async () => {
      mockCategoryModel.destroy.mockResolvedValue(1);

      const result = await ProblemCategoryRepo.deleteCategory(categoryId);

      expect(mockCategoryModel.destroy).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(result).toBe(true);
    });

    it("should return false if no row was deleted", async () => {
      mockCategoryModel.destroy.mockResolvedValue(0);

      const result = await ProblemCategoryRepo.deleteCategory(999);

      expect(result).toBe(false);
    });
  });
});