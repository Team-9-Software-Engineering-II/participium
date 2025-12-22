import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// --- 1. MOCK DEL MODELLO SEQUELIZE ---
const mockUserModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

// Mock dei modelli associati (necessari per le opzioni 'include')
const mockRoleModel = {};
const mockTechnicalOfficeModel = {};
const mockCategoryModel = {};
const mockReportModel = {};

// Mock dell'oggetto DB
const mockDb = {
  User: mockUserModel,
  Role: mockRoleModel,
  TechnicalOffice: mockTechnicalOfficeModel,
  Category: mockCategoryModel,
  Report: mockReportModel,
};

// Mock del modulo models
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

let UserRepo;

// Definizione delle opzioni 'include' attese (copiate dalla logica del repo)
const expectedIncludeOptions = [
  { model: mockDb.Role, as: "role" },
  {
    model: mockDb.TechnicalOffice,
    as: "technicalOffice",
    required: false,
    include: { model: mockDb.Category, as: "category" },
  },
  { model: mockDb.Report, as: "reports", required: false },
];

describe("User Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import dinamico del repo per usare i mock freschi
    UserRepo = await import("../../../repositories/user-repo.mjs");
  });

  // --------------------------------------------------------------------------
  // createUser
  // --------------------------------------------------------------------------
  describe("createUser", () => {
    it("should call User.create with correct data", async () => {
      const userData = { email: "test@test.com", username: "test" };
      const createdUser = { id: 1, ...userData };
      mockUserModel.create.mockResolvedValue(createdUser);

      const result = await UserRepo.createUser(userData);

      expect(mockUserModel.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(createdUser);
    });
  });

  // --------------------------------------------------------------------------
  // findAllUsers
  // --------------------------------------------------------------------------
  describe("findAllUsers", () => {
    it("should call User.findAll with complex includes", async () => {
      const users = [{ id: 1 }];
      mockUserModel.findAll.mockResolvedValue(users);

      const result = await UserRepo.findAllUsers();

      expect(mockUserModel.findAll).toHaveBeenCalledWith({
        include: expectedIncludeOptions,
      });
      expect(result).toEqual(users);
    });
  });

  // --------------------------------------------------------------------------
  // findUserById
  // --------------------------------------------------------------------------
  describe("findUserById", () => {
    it("should call User.findByPk with ID and includes", async () => {
      const user = { id: 1 };
      mockUserModel.findByPk.mockResolvedValue(user);

      const result = await UserRepo.findUserById(1);

      expect(mockUserModel.findByPk).toHaveBeenCalledWith(1, {
        include: expectedIncludeOptions,
      });
      expect(result).toEqual(user);
    });
  });

  // --------------------------------------------------------------------------
  // findUserByEmail
  // --------------------------------------------------------------------------
  describe("findUserByEmail", () => {
    it("should call User.findOne with email and includes", async () => {
      const email = "test@test.com";
      const user = { id: 1, email };
      mockUserModel.findOne.mockResolvedValue(user);

      const result = await UserRepo.findUserByEmail(email);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: { email },
        include: expectedIncludeOptions,
      });
      expect(result).toEqual(user);
    });
  });

  // --------------------------------------------------------------------------
  // findUserByUsername
  // --------------------------------------------------------------------------
  describe("findUserByUsername", () => {
    it("should call User.findOne with username and includes", async () => {
      const username = "testuser";
      const user = { id: 1, username };
      mockUserModel.findOne.mockResolvedValue(user);

      const result = await UserRepo.findUserByUsername(username);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: { username },
        include: expectedIncludeOptions,
      });
      expect(result).toEqual(user);
    });
  });

  // --------------------------------------------------------------------------
  // updateUser
  // --------------------------------------------------------------------------
  describe("updateUser", () => {
    const updateData = { firstName: "Updated" };

    it("should return true if update affects at least 1 row", async () => {
      mockUserModel.update.mockResolvedValue([1]); // 1 riga aggiornata

      const result = await UserRepo.updateUser(1, updateData);

      expect(mockUserModel.update).toHaveBeenCalledWith(updateData, { where: { id: 1 } });
      expect(result).toBe(true);
    });

    it("should return false if no rows are updated", async () => {
      mockUserModel.update.mockResolvedValue([0]); // 0 righe aggiornate

      const result = await UserRepo.updateUser(999, updateData);

      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // deleteUser
  // --------------------------------------------------------------------------
  describe("deleteUser", () => {
    it("should return true if delete affects at least 1 row", async () => {
      mockUserModel.destroy.mockResolvedValue(1); // 1 riga cancellata

      const result = await UserRepo.deleteUser(1);

      expect(mockUserModel.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(true);
    });

    it("should return false if no rows are deleted", async () => {
      mockUserModel.destroy.mockResolvedValue(0); // 0 righe cancellate

      const result = await UserRepo.deleteUser(999);

      expect(result).toBe(false);
    });
  });


  describe("findStaffWithFewestReports", () => {
    const technicalOfficeId = 1;

    it("should return null if no staff members found in office", async () => {
      mockUserModel.findAll.mockResolvedValue([]); // Nessuno staff

      const result = await UserRepo.findStaffWithFewestReports(technicalOfficeId);

      expect(mockUserModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { technicalOfficeId }
      }));
      expect(result).toBeNull();
    });

    it("should return staff with fewest active reports", async () => {
      const staffA = { id: 1, firstName: "A", lastName: "Z", assignedReports: [1, 2, 3] }; // 3 report
      const staffB = { id: 2, firstName: "B", lastName: "Z", assignedReports: [1] };       // 1 report (Vincitore)
      
      mockUserModel.findAll.mockResolvedValue([staffA, staffB]);

      const result = await UserRepo.findStaffWithFewestReports(technicalOfficeId);

      expect(result).toEqual(staffB);
    });

    it("should resolve tie by alphabetical order (LastName)", async () => {
      // Pareggio: entrambi 0 report
      const staffA = { id: 1, firstName: "John", lastName: "Doe", assignedReports: [] };
      const staffB = { id: 2, firstName: "Jane", lastName: "Aloha", assignedReports: [] }; // "Aloha" vince su "Doe"
      
      mockUserModel.findAll.mockResolvedValue([staffA, staffB]);

      const result = await UserRepo.findStaffWithFewestReports(technicalOfficeId);

      expect(result).toEqual(staffB);
    });
    
    it("should resolve tie by alphabetical order (FirstName) if LastName is same", async () => {
      // Pareggio totale: 0 report, stesso cognome
      const staffA = { id: 1, firstName: "Albert", lastName: "Doe", assignedReports: [] }; // "Albert" vince su "John"
      const staffB = { id: 2, firstName: "John", lastName: "Doe", assignedReports: [] };
      
      mockUserModel.findAll.mockResolvedValue([staffB, staffA]); // Ordine inverso nell'array

      const result = await UserRepo.findStaffWithFewestReports(technicalOfficeId);

      expect(result).toEqual(staffA);
    });

    it("should cover countB branch by handling null/undefined assignedReports in any order", async () => {
      const staffFull = { id: 1, firstName: "Full", lastName: "User", assignedReports: [1, 2] };
      const staffEmpty = { id: 2, firstName: "Empty", lastName: "User", assignedReports: null }; // Null fa scattare il : 0
      
      // Esecuzione 1: [Full, Empty] -> Qui è probabile che b=Empty (countB = 0)
      mockUserModel.findAll.mockResolvedValueOnce([staffFull, staffEmpty]);
      const result1 = await UserRepo.findStaffWithFewestReports(technicalOfficeId);
      expect(result1).toEqual(staffEmpty);

      // Esecuzione 2: [Empty, Full] -> Qui è probabile che a=Empty (countA = 0)
      mockUserModel.findAll.mockResolvedValueOnce([staffEmpty, staffFull]);
      const result2 = await UserRepo.findStaffWithFewestReports(technicalOfficeId);
      expect(result2).toEqual(staffEmpty);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: findExternalMaintainerWithFewestReports
  // --------------------------------------------------------------------------
  describe("findExternalMaintainerWithFewestReports", () => {
    const companyId = 10;

    it("should return null if no maintainers found in company", async () => {
      mockUserModel.findAll.mockResolvedValue([]); // Nessuno staff

      const result = await UserRepo.findExternalMaintainerWithFewestReports(companyId);

      expect(mockUserModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { companyId }
      }));
      expect(result).toBeNull();
    });

    it("should return maintainer with fewest active reports", async () => {
      const staffBusy = { id: 1, firstName: "Busy", lastName: "Guy", externalReports: [1, 2, 3] }; 
      const staffFree = { id: 2, firstName: "Free", lastName: "Guy", externalReports: [] };       
      
      mockUserModel.findAll.mockResolvedValue([staffBusy, staffFree]);

      const result = await UserRepo.findExternalMaintainerWithFewestReports(companyId);

      expect(result).toEqual(staffFree);
    });

    it("should resolve tie by alphabetical order (LastName)", async () => {
      const staffA = { id: 1, firstName: "John", lastName: "Doe", externalReports: [] };
      const staffB = { id: 2, firstName: "Jane", lastName: "Aloha", externalReports: [] }; 
      
      mockUserModel.findAll.mockResolvedValue([staffA, staffB]);

      const result = await UserRepo.findExternalMaintainerWithFewestReports(companyId);

      expect(result).toEqual(staffB);
    });
    
    it("should resolve tie by alphabetical order (FirstName) if LastName is same", async () => {
        const staffA = { id: 1, firstName: "Albert", lastName: "Doe", externalReports: [] };
        const staffB = { id: 2, firstName: "John", lastName: "Doe", externalReports: [] };
        
        mockUserModel.findAll.mockResolvedValue([staffB, staffA]);
  
        const result = await UserRepo.findExternalMaintainerWithFewestReports(companyId);
  
        expect(result).toEqual(staffA);
    });

    it("should handle null/undefined externalReports array", async () => {
      const staffNull = { id: 1, firstName: "A", lastName: "A", externalReports: undefined };
      const staffOne = { id: 2, firstName: "B", lastName: "B", externalReports: [1] };
      
      mockUserModel.findAll.mockResolvedValueOnce([staffOne, staffNull]);
      let result = await UserRepo.findExternalMaintainerWithFewestReports(companyId);
      expect(result).toEqual(staffNull);

      mockUserModel.findAll.mockResolvedValueOnce([staffNull, staffOne]);
      result = await UserRepo.findExternalMaintainerWithFewestReports(companyId);
      expect(result).toEqual(staffNull);
    });
  });

  // --------------------------------------------------------------------------
  // TEST: findUsersByCompanyId
  // --------------------------------------------------------------------------
  describe("findUsersByCompanyId", () => {
    it("should find users by companyId with role included", async () => {
      const companyId = 5;
      const mockUsers = [{ id: 1, username: "maintainer", companyId: 5 }];
      
      mockUserModel.findAll.mockResolvedValue(mockUsers);

      const result = await UserRepo.findUsersByCompanyId(companyId);

      expect(mockUserModel.findAll).toHaveBeenCalledWith({
        where: { companyId },
        include: [{ model: mockDb.Role, as: "role" }]
      });
      
      expect(result).toEqual(mockUsers);
    });
  });
});