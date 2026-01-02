import formData from "form-data";
import Mailgun from "mailgun.js";
import config from "@/config";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/infrastructure/logger";

// Initialize Mailgun client
const mailgun = new Mailgun(formData);
const mg = env.MAILGUN_API_KEY
  ? mailgun.client({
      username: "api",
      key: env.MAILGUN_API_KEY,
      url: "https://api.eu.mailgun.net", // Change to https://api.mailgun.net for US region
    })
  : null;

export interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    data: Buffer;
  }>;
}

/**
 * Send an email using Mailgun
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!mg) {
    logger.warn("Mailgun not configured, skipping email send", { to: params.to });
    return false;
  }

  const domain = config.mailgun.subdomain
    ? `${config.mailgun.subdomain}.${config.domainName}`
    : config.domainName;

  try {
    interface MessageData {
      from: string;
      to: string[];
      subject: string;
      text?: string;
      html?: string;
      "h:Reply-To"?: string;
    }

    const messageData: MessageData = {
      from: params.from || config.mailgun.fromAdmin,
      to: [params.to],
      subject: params.subject,
    };

    if (params.text) messageData.text = params.text;
    if (params.html) messageData.html = params.html;
    
    const replyTo = params.replyTo || config.mailgun.forwardRepliesTo;
    if (replyTo) messageData["h:Reply-To"] = replyTo;

    const result = await mg.messages.create(domain, messageData as any);

    logger.info("Email sent successfully", {
      to: params.to,
      subject: params.subject,
      messageId: result.id,
    });

    return true;
  } catch (error) {
    logger.error("Failed to send email", error, {
      to: params.to,
      subject: params.subject,
    });
    return false;
  }
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
  const subject = `Welcome to ${config.appName}!`;
  const html = `
    <h1>Welcome ${name || "there"}!</h1>
    <p>Thank you for joining ${config.appName}.</p>
    <p>We're excited to have you on board.</p>
    <p>If you have any questions, feel free to reply to this email.</p>
    <br />
    <p>Best regards,<br />The ${config.appName} Team</p>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Send a receipt email after successful payment
 */
export async function sendReceiptEmail(
  email: string,
  amount: number,
  planName: string
): Promise<boolean> {
  const subject = `Payment Receipt - ${config.appName}`;
  const html = `
    <h1>Payment Successful</h1>
    <p>Thank you for your payment!</p>
    <p><strong>Plan:</strong> ${planName}</p>
    <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}</p>
    <p>You now have full access to all features.</p>
    <br />
    <p>Best regards,<br />The ${config.appName} Team</p>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Send a cancellation confirmation email
 */
export async function sendCancellationEmail(
  email: string,
  endDate: Date
): Promise<boolean> {
  const subject = `Subscription Cancelled - ${config.appName}`;
  const html = `
    <h1>Subscription Cancelled</h1>
    <p>Your subscription has been cancelled.</p>
    <p>You'll continue to have access until <strong>${endDate.toLocaleDateString()}</strong>.</p>
    <p>We're sorry to see you go. If you change your mind, you can resubscribe at any time.</p>
    <br />
    <p>Best regards,<br />The ${config.appName} Team</p>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
  });
}
