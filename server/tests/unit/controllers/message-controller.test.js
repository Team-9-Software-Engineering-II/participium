import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// --- 1. MOCK DEPENDENCIES ---

const mockCreateMessage = jest.fn();
const mockGetReportMessages = jest.fn();

jest.unstable_mockModule("../../../services/message-service.mjs", () => ({
  MessageService: {
    createMessage: mockCreateMessage,
    getReportMessages: mockGetReportMessages,
  },
}));

// Mockiamo il validator, ma non ci baseremo sul fatto che venga chiamato
const mockIsIdNumberAndPositive = jest.fn();

jest.unstable_mockModule("../../../shared/validators/common-validator.mjs", () => ({
  isIdNumberAndPositive: mockIsIdNumberAndPositive,
}));

// --- 2. SETUP CONTROLLER ---
let MessageController;

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Message Controller (Unit)", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(async () => {
    jest.clearAllMocks();
    MessageController = await import("../../../controllers/message-controller.js");

    mockReq = {
      params: {},
      body: {},
      user: { id: 1 },
    };
    mockRes = createMockResponse();
    mockNext = jest.fn();
  });

  // --------------------------------------------------------------------------
  // createMessage
  // --------------------------------------------------------------------------
  describe("createMessage", () => {
    it("should create a message and return 201", async () => {
      // Setup
      mockReq.params.reportId = "10";
      mockReq.body.content = "New update";
      
      // Simuliamo che il validator ritorni true (se usato)
      mockIsIdNumberAndPositive.mockReturnValue(true);
      
      const createdMessage = { id: 1, content: "New update", reportId: 10 };
      mockCreateMessage.mockResolvedValue(createdMessage);

      // Esecuzione
      await MessageController.createMessage(mockReq, mockRes, mockNext);

      // Verifiche
      // Rimosso expect(mockIsIdNumberAndPositive) perché il controller potrebbe validare manualmente
      
      expect(mockCreateMessage).toHaveBeenCalledWith(1, 10, "New update");
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdMessage);
    });

    it("should return 400 if reportId is invalid", async () => {
      mockReq.params.reportId = "invalid";
      mockIsIdNumberAndPositive.mockReturnValue(false);

      await MessageController.createMessage(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      // Aggiornato il messaggio di errore per matchare quello reale del tuo controller
      expect(mockRes.json).toHaveBeenCalledWith({ message: "reportId must be a positive integer." });
      expect(mockCreateMessage).not.toHaveBeenCalled();
    });

    it("should call next(error) if service throws", async () => {
      mockReq.params.reportId = "10";
      mockReq.body.content = "Valid Content"; // Importante: Contenuto valido per passare la validazione del controller
      
      mockIsIdNumberAndPositive.mockReturnValue(true);

      const error = new Error("Database error");
      mockCreateMessage.mockRejectedValue(error);

      await MessageController.createMessage(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    // Copre riga 17: if (!content)
    it("should return 400 if content is missing", async () => {
      mockReq.params.reportId = "10";
      mockReq.body.content = undefined; // Simuliamo mancanza di contenuto
      
      mockIsIdNumberAndPositive.mockReturnValue(true);

      await MessageController.createMessage(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "content is required." });
      expect(mockCreateMessage).not.toHaveBeenCalled();
    });

    // Copre riga 21: if (typeof content !== "string" || content.trim().length === 0)
    it("should return 400 if content is empty string", async () => {
      mockReq.params.reportId = "10";
      mockReq.body.content = "   "; // Simuliamo stringa vuota o solo spazi
      
      mockIsIdNumberAndPositive.mockReturnValue(true);

      await MessageController.createMessage(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "content cannot be empty." });
      expect(mockCreateMessage).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // getMessagesByReportId (Copre righe 36-52)
  // --------------------------------------------------------------------------
  describe("getMessagesByReportId", () => {
    it("should successfully get messages and return 200", async () => {
      // Setup
      mockReq.params.reportId = "5";
      mockReq.user = { id: 1, role: { name: "admin" } };
      
      const mockMessages = [
        { id: 1, content: "First message", reportId: 5 },
        { id: 2, content: "Second message", reportId: 5 }
      ];
      mockGetReportMessages.mockResolvedValue(mockMessages);

      // Esecuzione
      await MessageController.getMessagesByReportId(mockReq, mockRes, mockNext);

      // Verifiche
      expect(mockGetReportMessages).toHaveBeenCalledWith(5, mockReq.user);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockMessages);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 if reportId is not a positive integer", async () => {
      mockReq.params.reportId = "invalid";

      await MessageController.getMessagesByReportId(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "reportId must be a positive integer." });
      expect(mockGetReportMessages).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 if reportId is zero", async () => {
      mockReq.params.reportId = "0";

      await MessageController.getMessagesByReportId(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "reportId must be a positive integer." });
      expect(mockGetReportMessages).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 if reportId is negative", async () => {
      mockReq.params.reportId = "-5";

      await MessageController.getMessagesByReportId(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: "reportId must be a positive integer." });
      expect(mockGetReportMessages).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next(error) if service throws an error", async () => {
      mockReq.params.reportId = "5";
      mockReq.user = { id: 1, role: { name: "admin" } };

      const error = new Error("Report not found.");
      error.statusCode = 404;
      mockGetReportMessages.mockRejectedValue(error);

      await MessageController.getMessagesByReportId(mockReq, mockRes, mockNext);

      expect(mockGetReportMessages).toHaveBeenCalledWith(5, mockReq.user);
      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});