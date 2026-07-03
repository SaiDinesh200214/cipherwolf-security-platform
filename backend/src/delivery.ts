import { config } from "./config.js";
import type { OtpChannel, OtpPurpose } from "./otp.js";

interface SendOtpInput {
  channel: OtpChannel;
  purpose: OtpPurpose;
  destination: string;
  code: string;
  username: string;
  context: {
    ip: string;
    userAgent: string;
    requestedAt: string;
  };
}

interface SendContactNotificationInput {
  to: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip: string;
  location: string;
  visitorId: string | null;
  createdAt: string;
}

function purposeLabel(purpose: OtpPurpose): string {
  if (purpose === "password_reset") return "password reset";
  if (purpose === "account_unlock") return "account unlock";
  return "admin login";
}

function detectDevice(userAgent: string): string {
  if (!userAgent) return "Unknown device";
  if (/android/i.test(userAgent)) return "Android device";
  if (/iphone|ipad|ios/i.test(userAgent)) return "iOS device";
  if (/macintosh|mac os/i.test(userAgent)) return "macOS device";
  if (/windows/i.test(userAgent)) return "Windows device";
  if (/linux/i.test(userAgent)) return "Linux device";
  return "Unknown device";
}

function detectBrowser(userAgent: string): string {
  if (!userAgent) return "Unknown browser";
  if (/brave/i.test(userAgent)) return "Brave";
  if (/edg/i.test(userAgent)) return "Microsoft Edge";
  if (/chrome|chromium/i.test(userAgent)) return "Chrome or Chromium";
  if (/safari/i.test(userAgent)) return "Safari";
  if (/firefox/i.test(userAgent)) return "Firefox";
  return "Unknown browser";
}

function otpText(input: SendOtpInput): string {
  return [
    "CipherWolf Security Alert",
    "",
    `OTP: ${input.code}`,
    `Action: ${purposeLabel(input.purpose)}`,
    `Account: ${input.username}`,
    "Valid for: 5 minutes",
    "",
    "Request details",
    `Time: ${input.context.requestedAt}`,
    `IP: ${input.context.ip}`,
    `Device: ${detectDevice(input.context.userAgent)}`,
    `Browser: ${detectBrowser(input.context.userAgent)}`,
    "",
    "If this was not you, do not share this OTP and reset your admin password immediately.",
  ].join("\n");
}

function otpHtml(input: SendOtpInput): string {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f7f6f3;padding:24px;color:#111">
      <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e5e1dc;border-radius:20px;padding:28px">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#777;margin:0 0 12px">CipherWolf Security Alert</p>
        <h1 style="font-size:28px;margin:0 0 18px">Admin OTP: ${input.code}</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Use this code to continue your ${purposeLabel(input.purpose)}. It expires in <b>5 minutes</b>.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#777">Account</td><td style="padding:8px 0;text-align:right">${input.username}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Time</td><td style="padding:8px 0;text-align:right">${input.context.requestedAt}</td></tr>
          <tr><td style="padding:8px 0;color:#777">IP</td><td style="padding:8px 0;text-align:right">${input.context.ip}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Device</td><td style="padding:8px 0;text-align:right">${detectDevice(input.context.userAgent)}</td></tr>
          <tr><td style="padding:8px 0;color:#777">Browser</td><td style="padding:8px 0;text-align:right">${detectBrowser(input.context.userAgent)}</td></tr>
        </table>
        <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#8a3d00">If this was not you, do not share this OTP and reset your admin password immediately.</p>
      </div>
    </div>
  `;
}

function isEmailSender(value: string) {
  return /^[^@\s]+@[^@\s]+$/.test(value) || /<[^@\s]+@[^>\s]+>/.test(value);
}

function hasResendCredentials() {
  return Boolean(
    config.smtpPass &&
    config.smtpPass.startsWith("re_") &&
    (!config.smtpFrom || isEmailSender(config.smtpFrom))
  );
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}) {
  if (!hasResendCredentials()) return false;

  const body: Record<string, unknown> = {
    from: config.smtpFrom || "CipherWolf <onboarding@resend.dev>",
    to: [input.to],
    subject: input.subject,
    text: input.text,
  };

  if (input.html) body.html = input.html;
  if (input.replyTo) body.reply_to = input.replyTo;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.smtpPass}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email delivery failed: ${detail}`);
  }

  return true;
}

async function sendEmailOtp(input: SendOtpInput) {
  return sendResendEmail({
    to: input.destination,
    subject: `CipherWolf Security OTP for ${purposeLabel(input.purpose)}`,
    text: otpText(input),
    html: otpHtml(input),
  });
}

async function sendTwilioWhatsappOtp(input: SendOtpInput) {
  if (
    !config.twilioAccountSid ||
    !config.twilioAuthToken ||
    !config.twilioWhatsappFrom ||
    config.twilioAccountSid === "your-twilio-account-sid" ||
    config.twilioAuthToken === "your-twilio-auth-token"
  ) {
    return false;
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: `whatsapp:${config.twilioWhatsappFrom}`,
      To: `whatsapp:${input.destination}`,
      Body: otpText(input),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twilio WhatsApp delivery failed: ${detail}`);
  }

  return true;
}

export async function sendOtp(input: SendOtpInput) {
  if (input.channel === "email") {
    return sendEmailOtp(input);
  }

  return sendTwilioWhatsappOtp(input);
}

export async function sendContactNotification(input: SendContactNotificationInput) {
  if (!input.to) {
    return false;
  }

  const text = [
    "New CipherWolf contact message",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    `Time: ${input.createdAt}`,
    `IP: ${input.ip}`,
    `Location: ${input.location}`,
    `Visitor ID: ${input.visitorId || "Unknown"}`,
    "",
    input.message,
  ].join("\n");

  return sendResendEmail({
    to: input.to,
    replyTo: input.email,
    subject: `New portfolio contact: ${input.subject}`,
    text,
  });
}
