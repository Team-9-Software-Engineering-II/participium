import {
  getTransporter,
  getPreviewUrl,
  getEmailProvider,
  getResendClient,
} from "../config/email.mjs";
import logger from "../shared/logging/logger.mjs";

/**
 * Email service for sending various types of emails.
 * Supports multiple providers: Resend, SMTP, and Ethereal (development).
 */
export class EmailService {
  /**
   * Sends a verification code email to the user.
   * @param {string} email - The recipient's email address.
   * @param {string} confirmationCode - The 6-digit verification code.
   * @param {string} firstName - The user's first name for personalization.
   * @returns {Promise<object>} The result of sending the email.
   */
  static async sendVerificationCode(email, confirmationCode, firstName) {
    const provider = getEmailProvider();

    if (provider === "resend") {
      return this.#sendWithResend(email, confirmationCode, firstName);
    } else {
      return this.#sendWithNodemailer(email, confirmationCode, firstName);
    }
  }

  /**
   * Sends verification email using Resend API.
   * @private
   */
  static async #sendWithResend(email, confirmationCode, firstName) {
    const resend = getResendClient();

    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "Participium <onboarding@resend.dev>",
        to: [email],
        subject: "Participium - Email Verification Code",
        text: this.#getVerificationTextContent(firstName, confirmationCode),
        html: this.#getVerificationHtmlContent(firstName, confirmationCode),
      });

      if (error) {
        logger.error(`Resend API error for ${email}`, {
          error: error.message,
          module: "EmailService",
        });
        throw new Error(error.message);
      }

      logger.info(`Verification email sent to ${email} via Resend`, {
        emailId: data.id,
        module: "EmailService",
      });

      logger.info(`\n📧 Real email sent to: ${email}`);
      logger.info(`   Email ID: ${data.id}\n`);

      return {
        success: true,
        messageId: data.id,
        previewUrl: null, // Resend doesn't have preview URLs - it's real email!
        provider: "resend",
      };
    } catch (error) {
      logger.error(`Failed to send verification email to ${email} via Resend`, {
        error: error.message,
        module: "EmailService",
      });
      throw error;
    }
  }

  /**
   * Sends verification email using Nodemailer (SMTP or Ethereal).
   * @private
   */
  static async #sendWithNodemailer(email, confirmationCode, firstName) {
    const transporter = getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Participium" <noreply@participium.com>',
      to: email,
      subject: "Participium - Email Verification Code",
      text: this.#getVerificationTextContent(firstName, confirmationCode),
      html: this.#getVerificationHtmlContent(firstName, confirmationCode),
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      logger.info(`Verification email sent to ${email}`, {
        messageId: info.messageId,
        module: "EmailService",
      });

      // Log preview URL for development (Ethereal)
      const previewUrl = getPreviewUrl(info);
      if (previewUrl) {
        logger.info(`Email preview URL: ${previewUrl}`, {
          module: "EmailService",
        });
        console.log(`\n📧 Email Preview URL: ${previewUrl}\n`);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl || null,
        provider: getEmailProvider(),
      };
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}`, {
        error: error.message,
        module: "EmailService",
      });
      throw error;
    }
  }

  /**
   * Generates plain text content for the verification email.
   * @param {string} firstName - User's first name.
   * @param {string} confirmationCode - The verification code.
   * @returns {string} Plain text email content.
   * @private
   */
  static #getVerificationTextContent(firstName, confirmationCode) {
    return `
Hello ${firstName},

Welcome to Participium!

Your email verification code is: ${confirmationCode}

This code will expire in 30 minutes.

If you did not request this verification, please ignore this email.

Best regards,
The Participium Team
Municipality of Turin
    `.trim();
  }

  /**
   * Generates HTML content for the verification email.
   * @param {string} firstName - User's first name.
   * @param {string} confirmationCode - The verification code.
   * @returns {string} HTML email content.
   * @private
   */
  static #getVerificationHtmlContent(firstName, confirmationCode) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #1a365d; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Participium</h1>
              <p style="margin: 10px 0 0; color: #a0aec0; font-size: 14px;">Municipality of Turin</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #2d3748; font-size: 24px;">Email Verification</h2>
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Hello <strong>${firstName}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                Welcome to Participium! Please use the following verification code to complete your registration:
              </p>
              
              <!-- Verification Code Box -->
              <div style="background-color: #edf2f7; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 10px; color: #718096; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                <p style="margin: 0; color: #1a365d; font-size: 36px; font-weight: bold; letter-spacing: 8px;">${confirmationCode}</p>
              </div>
              
              <p style="margin: 0 0 20px; color: #718096; font-size: 14px; line-height: 1.6;">
                ⏱️ This code will expire in <strong>30 minutes</strong>.
              </p>
              <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                If you did not request this verification, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                © 2025 Participium - Municipality of Turin. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
