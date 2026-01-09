import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- 1. MOCK MODELS & DB ---
const mockMessageModel = {
  findAll: jest.fn(),
  create: jest.fn(),
};

const mockUserModel = {}; // Serve solo come riferimento per l'include

const mockDb = {
  Message: mockMessageModel,
  User: mockUserModel,
  Role: {},
};

// --- 2. MOCK MODULE IMPORT ---
jest.unstable_mockModule("../../../models/index.mjs", () => ({
  default: mockDb,
}));

// Variabile per il repo importato dinamicamente
let MessageRepo;

describe("Message Repository (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import dinamico per garantire che il mock venga usato
    MessageRepo = await import("../../../repositories/message-repo.mjs");
  });

  describe("findMessagesByReportId", () => {
    const reportId = 1;

    it("should return messages with author details ordered by creation time", async () => {
      // Dati simulati
      const reportId = 1;
      const mockMessages = [
        { id: 1, content: "Hello", createdAt: "2023-01-01", author: { username: "Mario" } },
        { id: 2, content: "World", createdAt: "2023-01-02", author: { username: "Luigi" } }
      ];

      mockMessageModel.findAll.mockResolvedValue(mockMessages);

      const result = await MessageRepo.findMessagesByReportId(reportId);

      expect(mockMessageModel.findAll).toHaveBeenCalledWith({
        where: { reportId },
        include: [
          {
            model: mockDb.User,
            as: "author",
            attributes: [
              "id",
              "username",
              "firstName",
              "lastName",
              "photoURL" 
            ],
            include: [
              {
                model: mockDb.Role,
                as: "roles",
                attributes: ["id", "name"],
                through: { attributes: [] }
              }
            ]
          },
        ],
        order: [["createdAt", "ASC"]],
      });

      expect(result).toEqual(mockMessages);
    });

    it("should return empty array if no messages found", async () => {
      mockMessageModel.findAll.mockResolvedValue([]);

      const result = await MessageRepo.findMessagesByReportId(reportId);

      expect(result).toEqual([]);
    });

    it("should throw error if DB call fails", async () => {
      const error = new Error("DB Error");
      mockMessageModel.findAll.mockRejectedValue(error);

      await expect(MessageRepo.findMessagesByReportId(reportId))
        .rejects.toThrow("DB Error");
    });
  });

  describe("createMessage", () => {
    it("should create a new message", async () => {
      const inputData = { content: "Test content", reportId: 1, userId: 2 };
      const createdMessage = { id: 10, ...inputData, createdAt: new Date() };

      mockMessageModel.create.mockResolvedValue(createdMessage);

      const result = await MessageRepo.createMessage(inputData);

      expect(mockMessageModel.create).toHaveBeenCalledWith(inputData);
      expect(result).toEqual(createdMessage);
    });

    it("should throw error if creation fails", async () => {
      const error = new Error("DB Constraint Error");
      mockMessageModel.create.mockRejectedValue(error);

      await expect(MessageRepo.createMessage({}))
        .rejects.toThrow("DB Constraint Error");
    });
  });
});