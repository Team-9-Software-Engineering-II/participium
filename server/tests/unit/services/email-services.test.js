import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// --- 1. SETUP MOCKS ---

const mockGetTransporter = jest.fn();
const mockGetPreviewUrl = jest.fn();
const mockGetEmailProvider = jest.fn();
const mockGetResendClient = jest.fn();

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
};

// Mock config module
jest.unstable_mockModule("../../../config/email.mjs", () => ({
  getTransporter: mockGetTransporter,
  getPreviewUrl: mockGetPreviewUrl,
  getEmailProvider: mockGetEmailProvider,
  getResendClient: mockGetResendClient,
}));

// Mock logger
jest.unstable_mockModule("../../../shared/logging/logger.mjs", () => ({
  default: mockLogger,
}));

// --- 2. TEST SUITE ---

let EmailService;

describe("EmailService (Unit)", () => {
  // Salviamo console.log originale per ripristinarlo dopo
  const originalConsoleLog = console.log;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Silenziamo i console.log del service per tenere pulito l'output dei test
    console.log = jest.fn();
    
    EmailService = (await import("../../../services/email-service.mjs")).EmailService;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  const testEmail = "test@example.com";
  const testCode = "123456";
  const testName = "Mario";

  // ======================================================================
  // 1. PROVIDER: RESEND
  // ======================================================================
  describe("Resend Provider", () => {
    let mockResendSend;

    beforeEach(() => {
      mockGetEmailProvider.mockReturnValue("resend");
      mockResendSend = jest.fn();
      mockGetResendClient.mockReturnValue({
        emails: { send: mockResendSend },
      });
    });

    it("should send email successfully via Resend", async () => {
      // Mock successo Resend
      mockResendSend.mockResolvedValue({
        data: { id: "resend_id_123" },
        error: null,
      });

      const result = await EmailService.sendVerificationCode(testEmail, testCode, testName);

      // Verifiche
      expect(mockResendSend).toHaveBeenCalledWith(expect.objectContaining({
        to: [testEmail],
        subject: "Participium - Email Verification Code",
        // Verifica indiretta che il contenuto HTML/Text sia stato generato
        text: expect.stringContaining(testCode), 
        html: expect.stringContaining(testName),
      }));

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("via Resend"), 
        expect.any(Object)
      );
      
      expect(result).toEqual({
        success: true,
        messageId: "resend_id_123",
        previewUrl: null,
        provider: "resend",
      });
    });

    it("should throw error if Resend API returns error object", async () => {
      // Mock errore Resend
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: "Invalid API Key" },
      });

      await expect(EmailService.sendVerificationCode(testEmail, testCode, testName))
        .rejects.toThrow("Invalid API Key");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Resend API error"),
        expect.any(Object)
      );
    });

    it("should throw error if Resend call throws exception", async () => {
      // Mock eccezione di rete
      mockResendSend.mockRejectedValue(new Error("Network Error"));

      await expect(EmailService.sendVerificationCode(testEmail, testCode, testName))
        .rejects.toThrow("Network Error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send verification email"),
        expect.any(Object)
      );
    });
  });

  // ======================================================================
  // 2. PROVIDER: NODEMAILER (SMTP / ETHEREAL)
  // ======================================================================
  describe("Nodemailer Provider", () => {
    let mockSendMail;

    beforeEach(() => {
      mockGetEmailProvider.mockReturnValue("ethereal"); // o "smtp"
      mockSendMail = jest.fn();
      mockGetTransporter.mockReturnValue({
        sendMail: mockSendMail,
      });
    });

    it("should send email successfully with Preview URL (Ethereal flow)", async () => {
      // Mock successo Nodemailer
      const mockInfo = { messageId: "node_id_123" };
      mockSendMail.mockResolvedValue(mockInfo);
      mockGetPreviewUrl.mockReturnValue("http://ethereal.url");

      const result = await EmailService.sendVerificationCode(testEmail, testCode, testName);

      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
        to: testEmail,
        subject: "Participium - Email Verification Code",
        text: expect.stringContaining(testCode),
      }));

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Email preview URL: http://ethereal.url`),
        expect.any(Object)
      );

      expect(result).toEqual({
        success: true,
        messageId: "node_id_123",
        previewUrl: "http://ethereal.url",
        provider: "ethereal",
      });
    });

    it("should send email successfully without Preview URL (SMTP flow)", async () => {
      mockGetEmailProvider.mockReturnValue("smtp");
      
      const mockInfo = { messageId: "smtp_id_456" };
      mockSendMail.mockResolvedValue(mockInfo);
      mockGetPreviewUrl.mockReturnValue(false); // Nessuna preview per SMTP reale

      const result = await EmailService.sendVerificationCode(testEmail, testCode, testName);

      expect(result).toEqual({
        success: true,
        messageId: "smtp_id_456",
        previewUrl: null, // Verifica fallback a null
        provider: "smtp",
      });
    });

    it("should throw error if Nodemailer fails", async () => {
      mockSendMail.mockRejectedValue(new Error("SMTP Connection Failed"));

      await expect(EmailService.sendVerificationCode(testEmail, testCode, testName))
        .rejects.toThrow("SMTP Connection Failed");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send verification email"),
        expect.any(Object)
      );
    });
  });
});