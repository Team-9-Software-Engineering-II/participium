import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- 1. MOCK DEPENDENCIES ---
const mockFindMessagesByReportId = jest.fn();
const mockCreateMessage = jest.fn();
const mockFindReportById = jest.fn();

// Mock del Message Repository
jest.unstable_mockModule("../../../repositories/message-repo.mjs", () => ({
  findMessagesByReportId: mockFindMessagesByReportId,
  createMessage: mockCreateMessage,
}));

// Mock del Report Repository
jest.unstable_mockModule("../../../repositories/report-repo.mjs", () => ({
  findReportById: mockFindReportById,
}));

// --- 2. TEST SUITE ---
let MessageService;

describe("Message Service (Unit)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Import dinamico
    MessageService = (await import("../../../services/message-service.mjs")).MessageService;
  });

  const reportId = 1;
  const mockMessages = [{ id: 1, content: "Hello" }];
  
  // Scenari di Report
  const reportWithOfficer = { id: 1, technicalOfficerId: 10, externalMaintainerId: null };
  const reportWithMaintainer = { id: 1, technicalOfficerId: null, externalMaintainerId: 20 };

  // --------------------------------------------------------------------------
  // createMessage (Copre righe 17-42)
  // --------------------------------------------------------------------------
  describe("createMessage", () => {
    const userId = 5;
    const reportId = 1;
    const content = "Update on the situation";

    it("should successfully create a message and return the hydrated version", async () => {
      // 1. Report esiste
      mockFindReportById.mockResolvedValue({ id: reportId });
      
      // 2. Creazione DB (raw)
      const rawCreatedMessage = { id: 100, content, userId, reportId };
      mockCreateMessage.mockResolvedValue(rawCreatedMessage);

      // 3. Re-fetch con autore (hydrated)
      const hydratedMessage = { ...rawCreatedMessage, author: { username: "Mario" } };
      // Simuliamo che il repo ritorni una lista contenente il nostro messaggio
      mockFindMessagesByReportId.mockResolvedValue([hydratedMessage]);

      const result = await MessageService.createMessage(userId, reportId, content);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockCreateMessage).toHaveBeenCalledWith({
        content: content.trim(),
        userId,
        reportId
      });
      // Deve ritornare la versione con l'autore
      expect(result).toEqual(hydratedMessage);
    });

    it("should throw 404 if report does not exist", async () => {
      mockFindReportById.mockResolvedValue(null);

      await expect(MessageService.createMessage(userId, reportId, content))
        .rejects.toHaveProperty("statusCode", 404);
        
      expect(mockCreateMessage).not.toHaveBeenCalled();
    });

    it("should throw 400 if content is invalid or empty", async () => {
      mockFindReportById.mockResolvedValue({ id: reportId });

      // Test stringa vuota
      await expect(MessageService.createMessage(userId, reportId, "   "))
        .rejects.toHaveProperty("statusCode", 400);

      // Test null
      await expect(MessageService.createMessage(userId, reportId, null))
        .rejects.toHaveProperty("statusCode", 400);
    });

    it("should fallback to createdMessage if re-fetch does not find the message (Branch Coverage)", async () => {
      // Questo test copre la riga: "return message || createdMessage;" (ramo destro)
      
      mockFindReportById.mockResolvedValue({ id: reportId });
      
      const rawCreatedMessage = { id: 100, content, userId, reportId };
      mockCreateMessage.mockResolvedValue(rawCreatedMessage);

      // Simuliamo che il re-fetch ritorni una lista vuota o senza il nostro ID
      mockFindMessagesByReportId.mockResolvedValue([]); 

      const result = await MessageService.createMessage(userId, reportId, content);

      // Deve ritornare almeno l'oggetto creato grezzo
      expect(result).toEqual(rawCreatedMessage);
    });
  });

  // --------------------------------------------------------------------------
  // getReportMessages (Copre righe 52-85)
  // --------------------------------------------------------------------------
  describe("getReportMessages", () => {
    const reportId = 1;
    const mockMessages = [
      { id: 1, content: "First message", reportId: 1 },
      { id: 2, content: "Second message", reportId: 1 }
    ];

    it("should throw 404 if report does not exist", async () => {
      mockFindReportById.mockResolvedValue(null);
      const user = { id: 1, role: { name: "admin" } };

      await expect(MessageService.getReportMessages(reportId, user))
        .rejects.toHaveProperty("statusCode", 404);
        
      expect(mockFindMessagesByReportId).not.toHaveBeenCalled();
    });

    it("should throw 403 if user is a citizen", async () => {
      const report = { id: reportId, technicalOfficerId: null, externalMaintainerId: null };
      mockFindReportById.mockResolvedValue(report);
      
      const user = { id: 1, role: { name: "citizen" } };

      await expect(MessageService.getReportMessages(reportId, user))
        .rejects.toHaveProperty("statusCode", 403);
        
      expect(mockFindMessagesByReportId).not.toHaveBeenCalled();
    });

    it("should successfully return messages for admin user", async () => {
      const report = { id: reportId, technicalOfficerId: null, externalMaintainerId: null };
      mockFindReportById.mockResolvedValue(report);
      mockFindMessagesByReportId.mockResolvedValue(mockMessages);
      
      const user = { id: 1, role: { name: "admin" } };

      const result = await MessageService.getReportMessages(reportId, user);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindMessagesByReportId).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(mockMessages);
    });

    it("should successfully return messages for assigned technical officer", async () => {
      const officerId = 10;
      const report = { id: reportId, technicalOfficerId: officerId, externalMaintainerId: null };
      mockFindReportById.mockResolvedValue(report);
      mockFindMessagesByReportId.mockResolvedValue(mockMessages);
      
      const user = { id: officerId, role: { name: "technical-officer" } };

      const result = await MessageService.getReportMessages(reportId, user);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindMessagesByReportId).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(mockMessages);
    });

    it("should successfully return messages for assigned external maintainer", async () => {
      const maintainerId = 20;
      const report = { id: reportId, technicalOfficerId: null, externalMaintainerId: maintainerId };
      mockFindReportById.mockResolvedValue(report);
      mockFindMessagesByReportId.mockResolvedValue(mockMessages);
      
      const user = { id: maintainerId, role: { name: "external-maintainer" } };

      const result = await MessageService.getReportMessages(reportId, user);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindMessagesByReportId).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(mockMessages);
    });

    it("should throw 403 if user is not admin, not assigned officer, and not assigned maintainer", async () => {
      const report = { id: reportId, technicalOfficerId: 10, externalMaintainerId: 20 };
      mockFindReportById.mockResolvedValue(report);
      
      const user = { id: 99, role: { name: "technical-officer" } }; // Different user ID

      await expect(MessageService.getReportMessages(reportId, user))
        .rejects.toHaveProperty("statusCode", 403);
        
      expect(mockFindMessagesByReportId).not.toHaveBeenCalled();
    });

    it("should handle user without role property", async () => {
      const report = { id: reportId, technicalOfficerId: null, externalMaintainerId: null };
      mockFindReportById.mockResolvedValue(report);
      
      const user = { id: 99 }; // User without role

      await expect(MessageService.getReportMessages(reportId, user))
        .rejects.toHaveProperty("statusCode", 403);
        
      expect(mockFindMessagesByReportId).not.toHaveBeenCalled();
    });

    it("should handle report with both officer and maintainer assigned", async () => {
      const officerId = 10;
      const report = { id: reportId, technicalOfficerId: officerId, externalMaintainerId: 20 };
      mockFindReportById.mockResolvedValue(report);
      mockFindMessagesByReportId.mockResolvedValue(mockMessages);
      
      const user = { id: officerId, role: { name: "technical-officer" } };

      const result = await MessageService.getReportMessages(reportId, user);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindMessagesByReportId).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(mockMessages);
    });

    it("should handle string comparison for IDs (loose equality)", async () => {
      const officerId = 10;
      const report = { id: reportId, technicalOfficerId: "10", externalMaintainerId: null }; // String ID
      mockFindReportById.mockResolvedValue(report);
      mockFindMessagesByReportId.mockResolvedValue(mockMessages);
      
      const user = { id: officerId, role: { name: "technical-officer" } }; // Number ID

      const result = await MessageService.getReportMessages(reportId, user);

      expect(mockFindReportById).toHaveBeenCalledWith(reportId);
      expect(mockFindMessagesByReportId).toHaveBeenCalledWith(reportId);
      expect(result).toEqual(mockMessages);
    });
  });
});