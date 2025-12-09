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
});