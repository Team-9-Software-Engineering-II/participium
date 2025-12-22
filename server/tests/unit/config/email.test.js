import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// --- 1. SETUP MOCKS ---
const mockCreateTransport = jest.fn();
const mockCreateTestAccount = jest.fn();
const mockGetTestMessageUrl = jest.fn();

// Mock Nodemailer
jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
    createTestAccount: mockCreateTestAccount,
    getTestMessageUrl: mockGetTestMessageUrl,
  },
}));

// Mock Resend
const mockResendConstructor = jest.fn();
jest.unstable_mockModule("resend", () => ({
  Resend: mockResendConstructor,
}));

// Mock Logger
jest.unstable_mockModule("../../../shared/logging/logger.mjs", () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// --- 2. TEST SUITE ---
describe("Email Utility (Unit)", () => {
  let EmailUtils;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Resetta lo stato del modulo (variabili let)
    process.env = { ...originalEnv };

    // --- FIX IMPORTANTE: Configura i valori di ritorno di default ---
    
    // 1. createTestAccount deve restituire un oggetto con user/pass
    mockCreateTestAccount.mockResolvedValue({ 
        user: "test_user", 
        pass: "test_pass" 
    });

    // 2. createTransport deve restituire un oggetto "transporter" simulato
    // Altrimenti la variabile 'transporter' nel file reale rimane undefined
    mockCreateTransport.mockReturnValue({
        sendMail: jest.fn(),
        verify: jest.fn().mockResolvedValue(true)
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --------------------------------------------------------------------------
  // SCENARIO 1: RESEND (Priority High)
  // --------------------------------------------------------------------------
  it("should initialize with Resend if RESEND_API_KEY is present", async () => {
    process.env.RESEND_API_KEY = "re_123456";
    // Nota: Assicurati che il percorso dell'import sia corretto rispetto a dove hai il file
    // Se il file è in server/config/email.mjs, usa ../../../config/email.mjs
    // Se il file è in server/utils/email.mjs, usa ../../../utils/email.mjs
    // Qui uso il percorso dedotto dal tuo errore: config/email.mjs
    EmailUtils = await import("../../../config/email.mjs");

    await EmailUtils.initializeEmailTransporter();

    expect(mockResendConstructor).toHaveBeenCalledWith("re_123456");
    expect(EmailUtils.getEmailProvider()).toBe("resend");
    
    expect(EmailUtils.getResendClient()).toBeDefined();
    
    expect(() => EmailUtils.getTransporter()).toThrow("Email transporter not initialized");
  });

  it("should throw error if getResendClient is called without initialization", async () => {
    delete process.env.RESEND_API_KEY;
    // Qui si inizializzerà Ethereal (fallback), quindi initializeEmailTransporter non fallirà
    EmailUtils = await import("../../../config/email.mjs");
    await EmailUtils.initializeEmailTransporter();

    // Ma getResendClient deve fallire perché siamo in modalità Ethereal
    expect(() => EmailUtils.getResendClient()).toThrow("Resend client not initialized");
  });

  // --------------------------------------------------------------------------
  // SCENARIO 2: SMTP (Priority Medium)
  // --------------------------------------------------------------------------
  it("should initialize with SMTP if keys are present and Resend is missing", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";

    EmailUtils = await import("../../../config/email.mjs");
    await EmailUtils.initializeEmailTransporter();

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.com",
      port: 465,
      auth: { user: "user", pass: "pass" },
    }));
    expect(EmailUtils.getEmailProvider()).toBe("smtp");
    
    // Ora mockCreateTransport ritorna un oggetto, quindi questo non lancerà più errore
    expect(EmailUtils.getTransporter()).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // SCENARIO 3: ETHEREAL (Fallback)
  // --------------------------------------------------------------------------
  it("should fallback to Ethereal if no env vars are set", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;

    EmailUtils = await import("../../../config/email.mjs");
    await EmailUtils.initializeEmailTransporter();

    expect(mockCreateTestAccount).toHaveBeenCalled();
    // Verifica che usi le credenziali mockate nel beforeEach
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.ethereal.email",
      auth: { user: "test_user", pass: "test_pass" }
    }));
    expect(EmailUtils.getEmailProvider()).toBe("ethereal");

    expect(EmailUtils.getTestAccount()).toEqual({ user: "test_user", pass: "test_pass" });
    
    const info = { messageId: "123" };
    mockGetTestMessageUrl.mockReturnValue("http://ethereal.email/message");
    expect(EmailUtils.getPreviewUrl(info)).toBe("http://ethereal.email/message");
  });

  // --------------------------------------------------------------------------
  // EDGE CASES & ERRORS
  // --------------------------------------------------------------------------
  it("should throw error if getTransporter is called before initialization", async () => {
    EmailUtils = await import("../../../config/email.mjs");
    // NON chiamiamo initialize
    expect(() => EmailUtils.getTransporter()).toThrow("Email transporter not initialized");
  });

  it("should use default port 587 if SMTP_PORT is missing", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    delete process.env.SMTP_PORT; 

    EmailUtils = await import("../../../config/email.mjs");
    await EmailUtils.initializeEmailTransporter();

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      port: 587 
    }));
  });
});