import { createHash, randomInt, randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import { config } from "./config.js";
import { sendOtp } from "./delivery.js";
import { query, queryOne } from "./db.js";

export type OtpChannel = "email" | "whatsapp";
export type OtpPurpose = "login" | "password_reset" | "account_unlock";

interface OtpRow {
  id: string;
  admin_user_id: string;
  purpose: OtpPurpose;
  channel: OtpChannel;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  used_at: Date | null;
}

interface AdminOtpTarget {
  id: string;
  username: string;
  email: string | null;
  whatsapp: string | null;
}

export interface OtpRequestContext {
  ip: string;
  userAgent: string;
  requestedAt: string;
}

function createOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function maskedTarget(channel: OtpChannel, target: AdminOtpTarget): string {
  if (channel === "email") {
    return target.email ? target.email.replace(/(^.).*(@.*$)/, "$1***$2") : "configured email";
  }

  return target.whatsapp ? target.whatsapp.replace(/.(?=.{4})/g, "*") : "configured WhatsApp";
}

export async function createOtpChallenge(
  target: AdminOtpTarget,
  channel: OtpChannel,
  purpose: OtpPurpose,
  context: OtpRequestContext,
  logger: FastifyBaseLogger
) {
  const destination = channel === "email" ? target.email : target.whatsapp;
  if (!destination) {
    throw new Error(`${channel === "email" ? "Email" : "WhatsApp"} is not configured for this admin account.`);
  }

  const code = createOtpCode();
  const challengeId = randomUUID();

  await query(
    `INSERT INTO auth_otps (id, admin_user_id, purpose, channel, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + interval '5 minutes')`,
    [challengeId, target.id, purpose, channel, hashOtp(code)]
  );

  const delivered = await sendOtp({
    channel,
    purpose,
    destination,
    code,
    username: target.username,
    context,
  }).catch((err) => {
    logger.warn({ err, purpose, channel, destination }, "OTP delivery failed. Using development terminal fallback.");
    return false;
  });

  if (!delivered) {
    logger.warn({
      otp: code,
      purpose,
      channel,
      destination,
    }, "OTP delivery credentials missing. Using development terminal fallback.");
  }

  return {
    challengeId,
    channel,
    destination: maskedTarget(channel, target),
    expiresInSeconds: 300,
    provider: config.otpProvider,
  };
}

export async function verifyOtpChallenge(challengeId: string, code: string, purpose: OtpPurpose) {
  const challenge = await queryOne<OtpRow>(
    `SELECT id, admin_user_id, purpose, channel, code_hash, attempts, expires_at, used_at
     FROM auth_otps
     WHERE id = $1 AND purpose = $2`,
    [challengeId, purpose]
  );

  if (!challenge || challenge.used_at || new Date(challenge.expires_at).getTime() < Date.now()) {
    return null;
  }

  if (challenge.attempts >= 5) {
    return null;
  }

  if (challenge.code_hash !== hashOtp(code)) {
    await query("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = $1", [challengeId]);
    return null;
  }

  await query("UPDATE auth_otps SET used_at = now(), attempts = attempts + 1 WHERE id = $1", [challengeId]);
  return challenge;
}
