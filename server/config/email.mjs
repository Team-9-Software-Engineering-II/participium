import nodemailer from "nodemailer";
import { Resend } from "resend";
import logger from "../shared/logging/logger.mjs";

let transporter = null;
let testAccount = null;
let resendClient = null;
let emailProvider = "ethereal"; // "ethereal", "smtp", or "resend"

/**
 * Creates and configures the email transporter/client.
 * Priority: Resend > SMTP > Ethereal (development)
 */
export const initializeEmailTransporter = async () => {
  // Check if Resend API key is provided (highest priority)
  if (process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    emailProvider = "resend";
    logger.info("Email client initialized with Resend API");
    return;
  }

  // Check if we have production SMTP settings
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    emailProvider = "smtp";
    logger.info("Email transporter initialized with production SMTP settings");
    return;
  }

  // Use Ethereal for development/testing (fake SMTP that captures emails)
  testAccount = await nodemailer.createTestAccount();
  
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  
  emailProvider = "ethereal";
  logger.info("Email transporter initialized with Ethereal test account");
  logger.info(`Ethereal credentials - User: ${testAccount.user}`);
};

/**
 * Gets the email provider type being used.
 * @returns {"ethereal" | "smtp" | "resend"} The provider type
 */
export const getEmailProvider = () => emailProvider;

/**
 * Gets the Resend client instance.
 * @returns {Resend} The Resend client
 */
export const getResendClient = () => {
  if (!resendClient) {
    throw new Error("Resend client not initialized. Set RESEND_API_KEY environment variable.");
  }
  return resendClient;
};

/**
 * Gets the nodemailer transporter instance.
 * @returns {import("nodemailer").Transporter} The nodemailer transporter
 */
export const getTransporter = () => {
  if (!transporter) {
    throw new Error("Email transporter not initialized. Call initializeEmailTransporter() first.");
  }
  return transporter;
};

/**
 * Gets the test account info (only available in development mode with Ethereal).
 * @returns {object|null} The Ethereal test account or null
 */
export const getTestAccount = () => testAccount;

/**
 * Gets the preview URL for an email sent via Ethereal.
 * @param {object} info - The info object returned by sendMail
 * @returns {string|false} The preview URL or false if not available
 */
export const getPreviewUrl = (info) => {
  return nodemailer.getTestMessageUrl(info);
};

export default transporter;
