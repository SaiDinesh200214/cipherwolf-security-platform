import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import bcrypt from "bcryptjs";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "./config.js";
import { query, queryOne } from "./db.js";
import { sendContactNotification } from "./delivery.js";
import { createOtpChallenge, type OtpChannel, verifyOtpChallenge } from "./otp.js";
import { addRealtimeClient, broadcastRealtime } from "./realtime.js";

interface AdminUserRow {
  id: string;
  username: string;
  password_hash: string;
  email: string | null;
  whatsapp: string | null;
  role: string;
  token_version: number;
  failed_login_attempts: number;
  locked_until: Date | null;
}

interface AuthTokenRow {
  id: string;
  admin_user_id: string;
  csrf_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

interface AdminSessionRow {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface IpReputation {
  blocked: boolean;
  score: number;
  reason: string;
  source: string;
}

interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  source: string;
  status: string;
  pinned: boolean;
  visitorId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IpGeoLocation {
  ip: string;
  country: string | null;
  state: string | null;
  city: string | null;
  isp: string | null;
  asn: string | null;
  latitude: number | null;
  longitude: number | null;
  source: string;
}

interface VisitorTimelineEvent {
  id: string;
  type: string;
  path: string;
  createdAt: Date;
  projectTitle: string | null;
  browser: string;
  os: string;
  device: string;
  screenResolution: string;
  timezone: string;
  referrer: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationError: string | null;
  userAgent: string | null;
}

const ipGeoCache = new Map<string, IpGeoLocation | null>();
const ipReputationCache = new Map<string, IpReputation>();
const encryptedValuePrefix = "enc:v1:";

function sanitizeText(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .trim();
}

function sanitizeJson(value: unknown): unknown {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [sanitizeText(key), sanitizeJson(child)]));
  }
  return value;
}

function encryptionKey() {
  return createHash("sha256").update(config.dataEncryptionKey).digest();
}

function encryptSensitive(value: string | null | undefined) {
  if (!value) return value || null;
  if (value.startsWith(encryptedValuePrefix)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${encryptedValuePrefix}${Buffer.concat([iv, tag, encrypted]).toString("base64")}`;
}

function decryptSensitive(value: string | null | undefined) {
  if (!value || !value.startsWith(encryptedValuePrefix)) return value || "";
  try {
    const payload = Buffer.from(value.slice(encryptedValuePrefix.length), "base64");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseCookies(header: string | undefined) {
  return Object.fromEntries((header || "").split(";").map((cookie) => {
    const [name, ...parts] = cookie.trim().split("=");
    return [name, decodeURIComponent(parts.join("=") || "")];
  }).filter(([name]) => Boolean(name)));
}

function cookieHeader(name: string, value: string, maxAgeSeconds: number) {
  const sameSite = config.cookieSameSite === "none" ? "None" : config.cookieSameSite === "strict" ? "Strict" : "Lax";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (config.cookieSecure || sameSite === "None") parts.push("Secure");
  return parts.join("; ");
}

function clearCookieHeader(name: string) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getAuthCookie(request: FastifyRequest) {
  return parseCookies(request.headers.cookie).cw_access || "";
}

function getRefreshCookie(request: FastifyRequest) {
  return parseCookies(request.headers.cookie).cw_refresh || "";
}

function getCsrfHeader(request: FastifyRequest) {
  const header = request.headers["x-csrf-token"];
  return Array.isArray(header) ? header[0] || "" : header || "";
}

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(200),
  channel: z.enum(["email", "whatsapp"]),
});

const verifyLoginSchema = z.object({
  challengeId: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
});

const forgotPasswordSchema = z.object({
  username: z.string().trim().min(1).max(80),
  channel: z.enum(["email", "whatsapp"]),
});

const unlockAccountSchema = z.object({
  username: z.string().trim().min(1).max(80),
  channel: z.enum(["email", "whatsapp"]),
});

const verifyUnlockSchema = z.object({
  challengeId: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
});

const resetPasswordSchema = z.object({
  challengeId: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits."),
  newPassword: z.string().min(10).max(200),
});

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(180),
  subject: z.string().trim().max(240).optional(),
  message: z.string().trim().min(1).max(3000),
  source: z.string().trim().max(80).optional(),
  visitorId: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const contactUpdateSchema = z.object({
  status: z.enum(["new", "read", "archived"]).optional(),
  pinned: z.boolean().optional(),
});

const analyticsSchema = z.object({
  type: z.string().trim().min(1).max(80).default("page_view"),
  path: z.string().trim().min(1).max(300).default("/"),
  visitorId: z.string().trim().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const visitorLogSchema = z.object({
  type: z.string().trim().min(1).max(80).optional(),
  visitorId: z.string().trim().max(120).optional(),
  sessionId: z.string().trim().max(160).optional(),
  page: z.string().trim().max(1000).optional(),
  path: z.string().trim().max(300).optional(),
  collectedAt: z.string().trim().max(80).optional(),
  sessionStartedAt: z.string().trim().max(80).optional(),
  visitDurationMs: z.number().nonnegative().optional(),
  location: z.unknown().optional().nullable(),
  locationError: z.string().trim().max(300).optional(),
  referrer: z.string().trim().max(1000).optional().nullable(),
  userAgent: z.string().trim().max(1000).optional(),
  browser: z.string().trim().max(120).optional(),
  os: z.string().trim().max(120).optional(),
  device: z.string().trim().max(120).optional(),
  language: z.string().trim().max(80).optional(),
  languages: z.array(z.string()).optional(),
  platform: z.string().trim().max(120).optional(),
  timezone: z.string().trim().max(120).optional(),
  screen: z.record(z.string(), z.unknown()).optional(),
  viewport: z.record(z.string(), z.unknown()).optional(),
  projectId: z.string().trim().max(160).optional(),
  projectTitle: z.string().trim().max(240).optional(),
  projectCategory: z.string().trim().max(120).optional(),
  asset: z.string().trim().max(180).optional(),
  downloadName: z.string().trim().max(240).optional(),
});

const visitorNoteSchema = z.object({
  customName: z.string().trim().max(160).optional(),
  hostname: z.string().trim().max(160).optional(),
  flag: z.enum(["important", "watchlist", "safe", "monitor", "suspicious", "blocked"]).optional(),
  notes: z.string().trim().max(3000).optional(),
});

const visitorDeleteSchema = z.object({
  mode: z.enum(["trash", "permanent"]).default("trash"),
});

const reportSchema = z.object({
  type: z.enum(["visitor", "security", "contact", "resume", "projects", "monthly"]),
  format: z.enum(["json", "csv", "pdf", "excel"]).default("json"),
  fields: z.string().trim().max(1000).optional(),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(120),
});

const assistantSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
});

const privacyVisitorSchema = z.object({
  visitorId: z.string().trim().min(8).max(160),
});

const adminRouteAttemptSchema = z.object({
  path: z.string().trim().min(1).max(300),
  reason: z.string().trim().min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const cmsContentSchema = z.object({
  content: z.record(z.string(), z.unknown()),
});

const cmsBackupSchema = z.object({
  label: z.string().trim().min(1).max(180),
  source: z.enum(["manual", "pre-save", "default", "restore"]).default("manual"),
  content: z.record(z.string(), z.unknown()).optional(),
});

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return request.ip;
}

function isPublicIp(ip: string) {
  const normalized = ip.replace(/^::ffff:/, "");
  if (!normalized || normalized === "::1" || normalized === "127.0.0.1" || normalized === "localhost") return false;
  if (/^(10|127)\./.test(normalized)) return false;
  if (/^192\.168\./.test(normalized)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return false;
  if (/^(fc|fd|fe80):/i.test(normalized)) return false;
  return true;
}

async function getIpGeoLocation(ip: string): Promise<IpGeoLocation | null> {
  const normalized = ip.replace(/^::ffff:/, "");
  if (!isPublicIp(normalized)) return null;
  if (ipGeoCache.has(normalized)) return ipGeoCache.get(normalized) || null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(normalized)}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "CipherWolf-Security-Platform/1.0" },
    });
    if (!response.ok) throw new Error(`IP geo lookup failed with ${response.status}`);

    const data = (await response.json()) as Record<string, unknown>;
    const result: IpGeoLocation = {
      ip: normalized,
      country: getString(data.country_name),
      state: getString(data.region),
      city: getString(data.city),
      isp: getString(data.org),
      asn: getString(data.asn),
      latitude: getNumber(data.latitude),
      longitude: getNumber(data.longitude),
      source: "ipapi.co",
    };
    ipGeoCache.set(normalized, result);
    return result;
  } catch {
    ipGeoCache.set(normalized, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getIpReputation(ip: string): Promise<IpReputation> {
  const normalized = ip.replace(/^::ffff:/, "");
  if (!isPublicIp(normalized)) return { blocked: false, score: 0, reason: "Private or local IP", source: "local" };
  if (ipReputationCache.has(normalized)) return ipReputationCache.get(normalized)!;

  const listed = config.ipBlocklist.includes(normalized);
  if (listed) {
    const reputation = { blocked: true, score: 100, reason: "IP appears in local blocklist", source: "local-blocklist" };
    ipReputationCache.set(normalized, reputation);
    return reputation;
  }

  if (config.ipReputationProvider === "abuseipdb" && config.ipReputationApiKey) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(normalized)}&maxAgeInDays=90`, {
        signal: controller.signal,
        headers: {
          Key: config.ipReputationApiKey,
          Accept: "application/json",
        },
      });
      if (response.ok) {
        const data = (await response.json()) as { data?: { abuseConfidenceScore?: number; totalReports?: number } };
        const score = Number(data.data?.abuseConfidenceScore || 0);
        const reports = Number(data.data?.totalReports || 0);
        const reputation = {
          blocked: score >= 75,
          score,
          reason: reports > 0 ? `AbuseIPDB score ${score}, reports ${reports}` : "No AbuseIPDB reports",
          source: "abuseipdb",
        };
        ipReputationCache.set(normalized, reputation);
        return reputation;
      }
    } catch {
      // Fall back to local checks when the provider is unreachable.
    } finally {
      clearTimeout(timeout);
    }
  }

  const reputation = { blocked: false, score: 0, reason: "No reputation hit", source: "local" };
  ipReputationCache.set(normalized, reputation);
  return reputation;
}

async function blockBadIp(request: FastifyRequest, reply: FastifyReply, context: string) {
  const reputation = await getIpReputation(getClientIp(request));
  if (!reputation.blocked) return false;
  await logAdminSecurityEvent(request, "ip_reputation_blocked", `${context}: ${reputation.reason}`, request.url, { reputation });
  reply.code(403).send({ message: "Request blocked by IP reputation policy." });
  return true;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getOtpContext(request: FastifyRequest) {
  return {
    ip: getClientIp(request),
    userAgent: String(request.headers["user-agent"] || ""),
    requestedAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
  };
}

function decryptContactRow<T extends Partial<ContactMessageRow>>(row: T): T {
  return {
    ...row,
    name: decryptSensitive(row.name),
    email: decryptSensitive(row.email),
    subject: decryptSensitive(row.subject),
    message: decryptSensitive(row.message),
  };
}

function decryptContactRows<T extends Partial<ContactMessageRow>>(rows: T[]) {
  return rows.map(decryptContactRow);
}

async function createSessionCookies(app: FastifyInstance, reply: FastifyReply, request: FastifyRequest, user: AdminUserRow) {
  const accessToken = app.jwt.sign({
    sub: user.id,
    username: user.username,
    role: user.role,
    tokenVersion: user.token_version,
  });
  const refreshToken = randomBytes(48).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO auth_refresh_tokens (admin_user_id, token_hash, csrf_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' days')::interval)`,
    [user.id, hashToken(refreshToken), hashToken(csrfToken), request.headers["user-agent"] || null, getClientIp(request), String(config.refreshTokenTtlDays)]
  );
  reply.header("Set-Cookie", [
    cookieHeader("cw_access", accessToken, 24 * 60 * 60),
    cookieHeader("cw_refresh", refreshToken, config.refreshTokenTtlDays * 24 * 60 * 60),
  ]);
  return { accessToken, csrfToken };
}

async function logAdminSecurityEvent(
  request: FastifyRequest,
  eventType: string,
  reason: string,
  path = request.url || "/",
  metadata?: Record<string, unknown>
) {
  await query(
    `INSERT INTO admin_security_logs (event_type, path, reason, ip, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      eventType,
      path.slice(0, 300),
      reason.slice(0, 200),
      getClientIp(request),
      request.headers["user-agent"] || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

async function ensureBootstrapAdmin(username: string, password: string) {
  const user = await queryOne<{ id: string }>("SELECT id FROM admin_users WHERE username = $1", [username]);
  if (user) {
    await query(
      `UPDATE admin_users
       SET email = COALESCE(NULLIF($2, ''), email),
           whatsapp = COALESCE(NULLIF($3, ''), whatsapp),
           updated_at = now()
       WHERE id = $1`,
      [user.id, config.adminEmail, config.adminWhatsapp]
    );
    return;
  }

  await query(
    "INSERT INTO admin_users (username, password_hash, email, whatsapp, role) VALUES ($1, $2, $3, $4, $5)",
    [username, await bcrypt.hash(password, 12), config.adminEmail || null, config.adminWhatsapp || null, "admin"]
  );
}

async function createAdminOtpChallenge(
  user: AdminUserRow,
  channel: OtpChannel,
  purpose: "login" | "password_reset" | "account_unlock",
  request: FastifyRequest,
  reply: FastifyReply,
  logger: FastifyInstance["log"]
) {
  try {
    return await createOtpChallenge(user, channel, purpose, getOtpContext(request), logger);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP is not configured for this admin account.";
    reply.code(400).send({ message });
    return null;
  }
}

async function ensureContactColumns() {
  await query("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0");
  await query("ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ");
  await query("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject VARCHAR(240)");
  await query("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(120)");
  await query("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS metadata JSONB");
  await query("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false");
  await query("ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ");
  await query("ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(80)");
  await query(`CREATE TABLE IF NOT EXISTS cms_content (
    key VARCHAR(80) PRIMARY KEY,
    content JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS cms_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(180) NOT NULL,
    source VARCHAR(40) NOT NULL DEFAULT 'manual',
    content JSONB NOT NULL,
    restored_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await query("CREATE INDEX IF NOT EXISTS idx_cms_backups_created_at ON cms_backups (created_at DESC)");
  await query(`CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    csrf_hash TEXT NOT NULL,
    user_agent TEXT,
    ip TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await query("CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_admin_user_id ON auth_refresh_tokens (admin_user_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens (expires_at)");
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const bearer = request.headers.authorization?.replace("Bearer ", "") || "";
    const cookieToken = getAuthCookie(request);
    const token = bearer || cookieToken;
    if (!token) throw new Error("Missing token");
    const payload = request.server.jwt.verify<{ sub: string; tokenVersion: number }>(token);
    const user = await queryOne<{ token_version: number }>("SELECT token_version FROM admin_users WHERE id = $1", [payload.sub]);
    if (!user || user.token_version !== payload.tokenVersion) {
      await logAdminSecurityEvent(request, "admin_api_denied", "Invalid or stale admin token.");
      reply.code(401).send({ message: "Unauthorized." });
      return;
    }
    request.user = payload;
    const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase());
    if (unsafeMethod && !bearer) {
      const refreshToken = getRefreshCookie(request);
      const csrfToken = getCsrfHeader(request);
      const session = refreshToken
        ? await queryOne<AuthTokenRow>(
            `SELECT id, admin_user_id, csrf_hash, expires_at, revoked_at
             FROM auth_refresh_tokens
             WHERE token_hash = $1`,
            [hashToken(refreshToken)]
          )
        : null;
      if (!session || session.revoked_at || session.admin_user_id !== payload.sub || session.expires_at.getTime() < Date.now() || session.csrf_hash !== hashToken(String(csrfToken))) {
        await logAdminSecurityEvent(request, "csrf_denied", "Missing or invalid CSRF token.");
        reply.code(403).send({ message: "Invalid CSRF token." });
        return;
      }
    }
  } catch {
    await logAdminSecurityEvent(request, "admin_api_denied", "Missing or invalid admin token.");
    reply.code(401).send({ message: "Unauthorized." });
  }
}

async function getAdminSummary() {
  const [
    contactCount,
    newContactCount,
    analyticsCount,
    analyticsTodayCount,
    uniqueVisitorCount,
    socCount,
    openThreatCount,
    crmCount,
    recentContacts,
    recentEvents,
    recentSocEvents,
    recentCrmLeads,
    recentSecurityLogs,
    recentAdminSessions,
  ] = await Promise.all([
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM contact_messages WHERE status <> 'archived'"),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM contact_messages WHERE status = 'new' AND status <> 'archived'"),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM analytics_events WHERE deleted_at IS NULL"),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM analytics_events WHERE deleted_at IS NULL AND created_at >= now() - interval '24 hours'"),
    queryOne<{ count: string }>(
      "SELECT COUNT(DISTINCT COALESCE(ip, visitor_id))::text AS count FROM analytics_events WHERE deleted_at IS NULL AND COALESCE(ip, visitor_id) IS NOT NULL"
    ),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM soc_events"),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM soc_events WHERE resolved_at IS NULL"),
    queryOne<{ count: string }>("SELECT COUNT(*)::text AS count FROM crm_leads"),
    query(
      `SELECT id, name, email, subject, message, source, status, pinned, visitor_id AS "visitorId", metadata, ip, user_agent AS "userAgent", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM contact_messages
       WHERE status <> 'archived'
       ORDER BY pinned DESC, created_at DESC
       LIMIT 10`
    ),
    query(
      `SELECT id, type, path, visitor_id AS "visitorId", ip, created_at AS "createdAt"
       FROM analytics_events
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 20`
    ),
    query(
      `SELECT id, title, severity, source, ip, created_at AS "createdAt", resolved_at AS "resolvedAt"
       FROM soc_events
       ORDER BY created_at DESC
       LIMIT 10`
    ),
    query(
      `SELECT id, name, email, company, status, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM crm_leads
       ORDER BY created_at DESC
       LIMIT 10`
    ),
    query(
      `SELECT id, event_type AS "eventType", path, reason, ip, user_agent AS "userAgent", created_at AS "createdAt"
       FROM admin_security_logs
       ORDER BY created_at DESC
       LIMIT 10`
    ),
    query<AdminSessionRow>(
      `SELECT id, ip, user_agent AS "userAgent", created_at AS "createdAt", expires_at AS "expiresAt", revoked_at AS "revokedAt"
       FROM auth_refresh_tokens
       ORDER BY created_at DESC
       LIMIT 10`
    ),
  ]);

  return {
    totals: {
      contacts: Number(contactCount?.count || 0),
      newContacts: Number(newContactCount?.count || 0),
      analyticsEvents: Number(analyticsCount?.count || 0),
      analyticsEvents24h: Number(analyticsTodayCount?.count || 0),
      uniqueVisitors: Number(uniqueVisitorCount?.count || 0),
      socEvents: Number(socCount?.count || 0),
      openThreats: Number(openThreatCount?.count || 0),
      crmLeads: Number(crmCount?.count || 0),
    },
    recentContacts: decryptContactRows(recentContacts),
    recentEvents,
    recentSocEvents,
    recentCrmLeads,
    recentSecurityLogs,
    recentAdminSessions,
    systemHealth: getSystemHealth(),
  };
}

function getSystemHealth() {
  const memory = process.memoryUsage();
  const heapPercent = memory.heapTotal > 0 ? Math.round((memory.heapUsed / memory.heapTotal) * 100) : 0;
  return {
    apiStatus: "online",
    databaseStatus: "online",
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      heapPercent,
    },
  };
}

function getSecurityScoreDetails(summary: Awaited<ReturnType<typeof getAdminSummary>>) {
  const failedLogins = summary.recentSecurityLogs.filter((log) => log.eventType.toLowerCase().includes("login") || log.reason.toLowerCase().includes("login")).length;
  const checks = [
    { label: "Helmet", ready: true, detail: "Security headers and CSP are registered." },
    { label: "JWT", ready: config.jwtSecret.length >= 32, detail: config.jwtSecret.length >= 32 ? "Strong token secret configured." : "JWT secret is too short." },
    { label: "HTTPS", ready: config.cookieSecure, detail: config.cookieSecure ? "Secure cookies are enabled." : "Enable COOKIE_SECURE=true behind HTTPS." },
    { label: "2FA", ready: true, detail: "Admin login requires OTP verification." },
    { label: "WAF", ready: Boolean(config.cloudflareZoneId), detail: config.cloudflareZoneId ? "Cloudflare zone is configured." : "Add Cloudflare zone/account values for external WAF visibility." },
    { label: "Rate Limiter", ready: true, detail: "Fastify rate limits are registered." },
    { label: "Database", ready: summary.systemHealth.databaseStatus === "online", detail: `Database is ${summary.systemHealth.databaseStatus}.` },
    { label: "Encryption", ready: config.dataEncryptionKey.length >= 32, detail: "Sensitive fields use AES-GCM encryption." },
  ];
  const baseScore = Math.round((checks.filter((check) => check.ready).length / checks.length) * 100);
  const penalty = Math.min(35, summary.totals.openThreats * 5 + failedLogins * 2);
  return {
    score: Math.max(0, baseScore - penalty),
    stars: Math.max(1, Math.round((Math.max(0, baseScore - penalty) / 100) * 5)),
    checks,
    penalties: {
      openThreats: summary.totals.openThreats,
      failedLogins,
    },
  };
}

function getCloudflareStatus(summary: Awaited<ReturnType<typeof getAdminSummary>>) {
  const configured = Boolean(config.cloudflareZoneId && (config.cloudflareApiToken || config.cloudflareAccountId));
  return {
    connected: configured,
    status: configured ? "connected" : "not_configured",
    dns: Boolean(config.cloudflareZoneId),
    ssl: config.cookieSecure ? "expected_valid" : "local_or_insecure",
    ddosProtection: configured ? "active" : "configure_cloudflare",
    waf: configured ? "active" : "configure_cloudflare",
    botProtection: configured ? "available" : "configure_cloudflare",
    threatsBlockedToday: summary.recentSecurityLogs.length + summary.recentSocEvents.filter((event) => event.severity === "critical" || event.severity === "high").length,
  };
}

function getMetadataValue(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || !(key in metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function getLocationValue(metadata: unknown, key: "latitude" | "longitude" | "accuracy"): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const location = (metadata as Record<string, unknown>).location;
  if (!location || typeof location !== "object" || !(key in location)) return null;
  const value = (location as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function getIpGeoValue(metadata: unknown, key: keyof IpGeoLocation): string | number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const ipGeo = (metadata as Record<string, unknown>).ipGeo;
  if (!ipGeo || typeof ipGeo !== "object" || !(key in ipGeo)) return null;
  const value = (ipGeo as Record<string, unknown>)[key];
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function getIpGeoString(metadata: unknown, key: keyof IpGeoLocation): string | null {
  const value = getIpGeoValue(metadata, key);
  return typeof value === "string" ? value : null;
}

function getIpGeoNumber(metadata: unknown, key: keyof IpGeoLocation): number | null {
  const value = getIpGeoValue(metadata, key);
  return typeof value === "number" ? value : null;
}

function getScreenResolution(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const screen = (metadata as Record<string, unknown>).screen;
  if (!screen || typeof screen !== "object") return null;
  const width = (screen as Record<string, unknown>).width;
  const height = (screen as Record<string, unknown>).height;
  if (typeof width !== "number" || typeof height !== "number") return null;
  return `${width} x ${height}`;
}

function ipColor(seed: string) {
  const colors = ["#ef4444", "#10b981", "#8b5cf6", "#f97316", "#06b6d4", "#eab308", "#ec4899"];
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length];
}

function getSuspiciousRequestReason(path: string, type: string) {
  const normalized = `${path} ${type}`.toLowerCase();
  const signatures = [
    { token: "/admin", reason: "Admin route probe" },
    { token: ".env", reason: "Environment file probe" },
    { token: "wp-admin", reason: "WordPress admin probe" },
    { token: "wp-login", reason: "WordPress login probe" },
    { token: ".php", reason: "PHP exploit probe" },
    { token: "../", reason: "Directory traversal probe" },
    { token: "select ", reason: "SQL injection probe" },
    { token: "<script", reason: "Script injection probe" },
    { token: "security", reason: "Security event signal" },
  ];
  return signatures.find((signature) => normalized.includes(signature.token))?.reason || null;
}

async function getVisitorIntelligence(includeDeleted = false) {
  const rows = await query<{
    id: string;
    type: string;
    path: string;
    visitorId: string | null;
    ip: string | null;
    userAgent: string | null;
    metadata: unknown;
    createdAt: Date;
  }>(
    `SELECT id, type, path, visitor_id AS "visitorId", ip, user_agent AS "userAgent", metadata, created_at AS "createdAt"
     FROM analytics_events
     WHERE ${includeDeleted ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"}
     ORDER BY created_at DESC
     LIMIT 1000`
  );
  const notes = await query<{
    visitorKey: string;
    customName: string | null;
    hostname: string | null;
    flag: string;
    notes: string | null;
    updatedAt: Date;
  }>(
    `SELECT visitor_key AS "visitorKey", custom_name AS "customName", hostname, flag, notes, updated_at AS "updatedAt"
     FROM visitor_notes`
  );
  const notesByKey = new Map(notes.map((note) => [note.visitorKey, {
    ...note,
    customName: decryptSensitive(note.customName),
    hostname: decryptSensitive(note.hostname),
    notes: decryptSensitive(note.notes),
  }]));
  const groups = new Map<string, typeof rows>();

  for (const row of rows) {
    const key = row.ip || row.visitorId || "unknown";
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).map(([visitorKey, events]) => {
    const ordered = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const latest = events[0];
    const latestMetadata = latest.metadata;
    const latestIpGeoMetadata = events.find((event) => getIpGeoNumber(event.metadata, "latitude") !== null && getIpGeoNumber(event.metadata, "longitude") !== null)?.metadata || latestMetadata;
    const note = notesByKey.get(visitorKey);
    const pages = Array.from(new Set(events.map((event) => event.path).filter(Boolean)));
    const sessions = Array.from(
      events.reduce((sessionMap, event) => {
        const sessionId = getMetadataValue(event.metadata, "sessionId") || event.visitorId || event.id;
        const existing = sessionMap.get(sessionId);
        const eventTime = event.createdAt.getTime();
        if (!existing) {
          sessionMap.set(sessionId, {
            sessionId,
            visitorId: event.visitorId,
            browser: getMetadataValue(event.metadata, "browser") || "Unknown",
            os: getMetadataValue(event.metadata, "os") || "Unknown",
            device: getMetadataValue(event.metadata, "device") || "Unknown",
            firstSeen: event.createdAt,
            lastSeen: event.createdAt,
            eventCount: 1,
          });
          return sessionMap;
        }
        existing.eventCount += 1;
        if (eventTime < existing.firstSeen.getTime()) existing.firstSeen = event.createdAt;
        if (eventTime > existing.lastSeen.getTime()) existing.lastSeen = event.createdAt;
        return sessionMap;
      }, new Map<string, { sessionId: string; visitorId: string | null; browser: string; os: string; device: string; firstSeen: Date; lastSeen: Date; eventCount: number }>())
      .values()
    ).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
    const projectClicks = events
      .filter((event) => event.type === "project_click" || getMetadataValue(event.metadata, "type") === "project_click")
      .map((event) => ({
        title: getMetadataValue(event.metadata, "projectTitle") || "Project",
        category: getMetadataValue(event.metadata, "projectCategory"),
        createdAt: event.createdAt,
      }));
    const resumeDownloaded = events.some((event) => event.type === "resume_download" || getMetadataValue(event.metadata, "type") === "resume_download");
    const suspiciousSignals = events.filter((event) => event.path.toLowerCase().includes("/admin") || event.type.includes("security")).length;
    const threatScore = Math.min(100, suspiciousSignals * 25 + (events.length > 20 ? 12 : 0) + (resumeDownloaded ? 0 : 3));

    return {
      visitorKey,
      visitorId: latest.visitorId,
      ip: latest.ip,
      color: ipColor(visitorKey),
      customName: note?.customName || null,
      hostname: note?.hostname || null,
      flag: note?.flag || (threatScore >= 70 ? "suspicious" : "monitor"),
      notes: note?.notes || "",
      country: getIpGeoString(latestIpGeoMetadata, "country") || getMetadataValue(latestMetadata, "country") || "Unknown",
      state: getIpGeoString(latestIpGeoMetadata, "state") || getMetadataValue(latestMetadata, "state") || "Unknown",
      city: getIpGeoString(latestIpGeoMetadata, "city") || getMetadataValue(latestMetadata, "city") || "Unknown",
      isp: getIpGeoString(latestIpGeoMetadata, "isp") || getMetadataValue(latestMetadata, "isp") || "Unknown",
      asn: getIpGeoString(latestIpGeoMetadata, "asn") || getMetadataValue(latestMetadata, "asn") || "Unknown",
      ipLatitude: getIpGeoNumber(latestIpGeoMetadata, "latitude"),
      ipLongitude: getIpGeoNumber(latestIpGeoMetadata, "longitude"),
      ipGeoSource: latest.ip && !isPublicIp(latest.ip) ? "Private/local IP - public geo unavailable" : getIpGeoString(latestIpGeoMetadata, "source"),
      latitude: getLocationValue(latestMetadata, "latitude"),
      longitude: getLocationValue(latestMetadata, "longitude"),
      accuracy: getLocationValue(latestMetadata, "accuracy"),
      browser: getMetadataValue(latestMetadata, "browser") || "Unknown",
      os: getMetadataValue(latestMetadata, "os") || "Unknown",
      device: getMetadataValue(latestMetadata, "device") || "Unknown",
      screenResolution: getScreenResolution(latestMetadata) || "Unknown",
      timezone: getMetadataValue(latestMetadata, "timezone") || "Unknown",
      language: getMetadataValue(latestMetadata, "language") || "Unknown",
      referrer: getMetadataValue(latestMetadata, "referrer") || "Direct",
      firstVisit: ordered[0]?.createdAt,
      lastVisit: latest.createdAt,
      visitCount: sessions.length || 1,
      eventCount: events.length,
      sessions,
      visitDurationMs: Number(getMetadataValue(latestMetadata, "visitDurationMs") || 0),
      pages,
      resumeDownloaded,
      projectClicks,
      threatScore,
      timeline: ordered.map((event) => ({
        id: event.id,
        type: getMetadataValue(event.metadata, "type") || event.type,
        path: event.path,
        createdAt: event.createdAt,
        projectTitle: getMetadataValue(event.metadata, "projectTitle"),
        browser: getMetadataValue(event.metadata, "browser") || "Unknown",
        os: getMetadataValue(event.metadata, "os") || "Unknown",
        device: getMetadataValue(event.metadata, "device") || "Unknown",
        screenResolution: getScreenResolution(event.metadata) || "Unknown",
        timezone: getMetadataValue(event.metadata, "timezone") || "Unknown",
        referrer: getMetadataValue(event.metadata, "referrer") || "Direct",
        latitude: getLocationValue(event.metadata, "latitude"),
        longitude: getLocationValue(event.metadata, "longitude"),
        accuracy: getLocationValue(event.metadata, "accuracy"),
        locationError: getMetadataValue(event.metadata, "locationError"),
        userAgent: event.userAgent,
      } satisfies VisitorTimelineEvent)),
    };
  });
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(",")),
  ].join("\n");
}

async function getUniversalSearchResults(term: string) {
  const like = `%${term.toLowerCase()}%`;
  const [events, securityLogs, contacts, visitors] = await Promise.all([
    query<{ id: string; type: string; path: string; visitorId: string | null; ip: string | null; createdAt: Date }>(
      `SELECT id, type, path, visitor_id AS "visitorId", ip, created_at AS "createdAt"
       FROM analytics_events
       WHERE deleted_at IS NULL
         AND (lower(type) LIKE $1 OR lower(path) LIKE $1 OR lower(COALESCE(visitor_id, '')) LIKE $1 OR lower(COALESCE(ip, '')) LIKE $1)
       ORDER BY created_at DESC
       LIMIT 20`,
      [like]
    ),
    query<{ id: string; eventType: string; path: string; reason: string; ip: string | null; createdAt: Date }>(
      `SELECT id, event_type AS "eventType", path, reason, ip, created_at AS "createdAt"
       FROM admin_security_logs
       WHERE lower(event_type) LIKE $1 OR lower(path) LIKE $1 OR lower(reason) LIKE $1 OR lower(COALESCE(ip, '')) LIKE $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [like]
    ),
    query<ContactMessageRow>(
      `SELECT id, name, email, subject, message, source, status, pinned, visitor_id AS "visitorId", metadata, ip, user_agent AS "userAgent", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM contact_messages
       WHERE status <> 'archived'
       ORDER BY created_at DESC
       LIMIT 100`
    ),
    getVisitorIntelligence(),
  ]);

  const lowered = term.toLowerCase();
  const contactResults = decryptContactRows(contacts)
    .filter((contact) => [contact.name, contact.email, contact.subject || "", contact.message, contact.visitorId || "", contact.ip || ""].some((value) => value.toLowerCase().includes(lowered)))
    .slice(0, 20)
    .map((contact) => ({
      id: contact.id,
      type: "message",
      title: contact.subject || contact.name,
      detail: `${contact.email} / ${contact.status}`,
      path: "/admin/contacts",
      createdAt: contact.createdAt,
    }));

  const visitorResults = visitors
    .filter((visitor) => [visitor.visitorKey, visitor.visitorId || "", visitor.ip || "", visitor.country, visitor.city, visitor.isp, visitor.hostname || "", visitor.customName || ""].some((value) => value.toLowerCase().includes(lowered)))
    .slice(0, 20)
    .map((visitor) => ({
      id: visitor.visitorKey,
      type: "visitor",
      title: visitor.customName || visitor.hostname || visitor.ip || visitor.visitorId || "Visitor",
      detail: `${visitor.country} / ${visitor.device} / score ${visitor.threatScore}`,
      path: `/admin/visitors?visitor=${encodeURIComponent(visitor.visitorKey)}`,
      createdAt: visitor.lastVisit,
    }));

  return [
    ...visitorResults,
    ...contactResults,
    ...events.map((event) => ({
      id: event.id,
      type: event.type.includes("resume") ? "resume" : event.type.includes("project") ? "project" : "event",
      title: event.type,
      detail: `${event.path} / ${event.ip || event.visitorId || "unknown"}`,
      path: event.type.includes("resume") ? "/admin/reports" : "/admin/visitors",
      createdAt: event.createdAt,
    })),
    ...securityLogs.map((log) => ({
      id: log.id,
      type: "security",
      title: log.eventType,
      detail: `${log.reason} / ${log.ip || "unknown"}`,
      path: "/admin/soc",
      createdAt: log.createdAt,
    })),
  ].slice(0, 40);
}

async function getAssistantAnswer(prompt: string) {
  const summary = await getAdminSummary();
  const visitors = await getVisitorIntelligence();
  const normalized = prompt.toLowerCase();
  const highRiskVisitors = visitors.filter((visitor) => visitor.threatScore >= 50 || ["watchlist", "suspicious", "blocked"].includes(visitor.flag));
  const projectCounts = visitors.flatMap((visitor) => visitor.projectClicks).reduce<Record<string, number>>((counts, project) => {
    counts[project.title] = (counts[project.title] || 0) + 1;
    return counts;
  }, {});
  const topProject = Object.entries(projectCounts).sort((a, b) => b[1] - a[1])[0];

  if (normalized.includes("today") && normalized.includes("visitor")) {
    return {
      answer: `Today recorded ${summary.totals.analyticsEvents24h} visitor events across ${summary.totals.uniqueVisitors} known visitors.`,
      cards: visitors.slice(0, 5).map((visitor) => ({ label: visitor.country, value: visitor.ip || visitor.visitorId || "Visitor", detail: `${visitor.eventCount} events` })),
    };
  }
  if (normalized.includes("attack") || normalized.includes("threat")) {
    return {
      answer: `There are ${summary.totals.openThreats} open threats, ${summary.recentSecurityLogs.length} recent security logs, and ${highRiskVisitors.length} high-risk visitors.`,
      cards: summary.recentSecurityLogs.slice(0, 5).map((log) => ({ label: log.eventType, value: log.ip || "unknown", detail: log.reason })),
    };
  }
  if (normalized.includes("weekly") || normalized.includes("report")) {
    return {
      answer: "Weekly report is ready from the Reports page. Use Security, Visitor, Resume, Project, or Monthly export for PDF/CSV/Excel output.",
      cards: [
        { label: "Visitors", value: String(summary.totals.uniqueVisitors), detail: "Tracked visitors" },
        { label: "Contacts", value: String(summary.totals.contacts), detail: "Contact messages" },
        { label: "Security", value: String(summary.recentSecurityLogs.length), detail: "Recent logs" },
      ],
    };
  }
  if (normalized.includes("project") && (normalized.includes("most") || normalized.includes("traffic"))) {
    return {
      answer: topProject ? `${topProject[0]} currently gets the most project traffic with ${topProject[1]} tracked clicks.` : "No project click traffic has been recorded yet.",
      cards: Object.entries(projectCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value: String(value), detail: "Project clicks" })),
    };
  }
  if (normalized.includes("high-risk") || normalized.includes("high risk")) {
    return {
      answer: `${highRiskVisitors.length} visitors are currently high-risk or marked for review.`,
      cards: highRiskVisitors.slice(0, 5).map((visitor) => ({ label: visitor.ip || visitor.visitorId || "Visitor", value: String(visitor.threatScore), detail: `${visitor.country} / ${visitor.flag}` })),
    };
  }

  return {
    answer: `Cipher AI can summarize visitors, attack activity, weekly reports, top projects, and high-risk visitors. Current security score is ${getSecurityScoreDetails(summary).score}/100.`,
    cards: [
      { label: "Visitors", value: String(summary.totals.uniqueVisitors), detail: `${summary.totals.analyticsEvents24h} events / 24h` },
      { label: "Threats", value: String(summary.totals.openThreats), detail: "Open threats" },
      { label: "Messages", value: String(summary.totals.newContacts), detail: "Unread contacts" },
    ],
  };
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(title: string, rows: Array<Record<string, unknown>>) {
  const lines = [
    title,
    `Generated: ${new Date().toISOString()}`,
    `Rows: ${rows.length}`,
    "",
    ...rows.slice(0, 45).map((row) => JSON.stringify(row).slice(0, 120)),
  ];
  const stream = [
    "BT",
    "/F1 10 Tf",
    "40 790 Td",
    "14 TL",
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export async function createApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    bodyLimit: 20 * 1024 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "wss:"],
        fontSrc: ["'self'", "data:"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  await app.register(cors, {
    origin: config.frontendOrigin === "*" ? true : config.frontendOrigin,
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.tokenTtl },
  });
  await app.register(websocket);
  await ensureContactColumns();

  app.get("/api/health", async () => {
    await query("SELECT 1");
    return {
      ok: true,
      service: "cipherwolf-backend",
      database: "postgresql",
      realtime: "enabled",
      timestamp: new Date().toISOString(),
    };
  });

  app.post("/api/auth/login", {
    config: {
      rateLimit: {
        max: 8,
        timeWindow: "15 minutes",
      },
    },
  }, async (request, reply) => {
    if (await blockBadIp(request, reply, "login")) return;
    const body = loginSchema.parse(request.body);
    await ensureBootstrapAdmin(config.adminUsername, config.adminPassword);

    const user = await queryOne<AdminUserRow>(
      "SELECT id, username, password_hash, email, whatsapp, role, token_version, failed_login_attempts, locked_until FROM admin_users WHERE username = $1",
      [body.username]
    );

    if (user?.locked_until && user.locked_until.getTime() > Date.now()) {
      reply.code(423).send({ message: "Account locked after 3 failed attempts. Use account unlock OTP or wait 24 hours." });
      return;
    }

    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      if (user) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        await query(
          `UPDATE admin_users
           SET failed_login_attempts = $2,
               locked_until = CASE WHEN $2 >= 3 THEN now() + interval '24 hours' ELSE locked_until END,
               updated_at = now()
           WHERE id = $1`,
          [user.id, attempts]
        );
        await logAdminSecurityEvent(request, "login_failed", attempts >= 3 ? "Account locked after 3 failed attempts." : "Invalid admin password.");
        if (attempts >= 3) {
          reply.code(423).send({ message: "Account locked after 3 failed attempts. Use account unlock OTP or wait 24 hours." });
          return;
        }
      }
      reply.code(401).send({ message: "Invalid username or password." });
      return;
    }

    await query("UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1", [user.id]);
    const challenge = await createAdminOtpChallenge(user, body.channel as OtpChannel, "login", request, reply, app.log);
    if (!challenge) return;
    return {
      message: `OTP sent to ${challenge.destination}. It expires in 5 minutes.`,
      ...challenge,
    };
  });

  app.post("/api/auth/login/verify", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "15 minutes",
      },
    },
  }, async (request, reply) => {
    if (await blockBadIp(request, reply, "login_verify")) return;
    const body = verifyLoginSchema.parse(request.body);
    const challenge = await verifyOtpChallenge(body.challengeId, body.otp, "login");

    if (!challenge) {
      reply.code(401).send({ message: "Invalid or expired OTP." });
      return;
    }

    const user = await queryOne<AdminUserRow>(
      "SELECT id, username, password_hash, email, whatsapp, role, token_version, failed_login_attempts, locked_until FROM admin_users WHERE id = $1",
      [challenge.admin_user_id]
    );

    if (!user) {
      reply.code(401).send({ message: "Invalid or expired OTP." });
      return;
    }

    await query("UPDATE admin_users SET last_login_at = now(), failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1", [user.id]);
    await logAdminSecurityEvent(request, "login_success", "Admin login successful.");

    const session = await createSessionCookies(app, reply, request, user);

    return {
      csrfToken: session.csrfToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  });

  app.post("/api/auth/password/forgot", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
  }, async (request, reply) => {
    if (await blockBadIp(request, reply, "password_forgot")) return;
    const body = forgotPasswordSchema.parse(request.body);
    await ensureBootstrapAdmin(config.adminUsername, config.adminPassword);

    const user = await queryOne<AdminUserRow>(
      "SELECT id, username, password_hash, email, whatsapp, role, token_version, failed_login_attempts, locked_until FROM admin_users WHERE username = $1",
      [body.username]
    );

    if (!user) {
      reply.code(404).send({ message: "Admin account not found." });
      return;
    }

    const challenge = await createAdminOtpChallenge(user, body.channel as OtpChannel, "password_reset", request, reply, app.log);
    if (!challenge) return;
    return {
      message: `Password reset OTP sent to ${challenge.destination}. It expires in 5 minutes.`,
      ...challenge,
    };
  });

  app.post("/api/auth/unlock", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "15 minutes",
      },
    },
  }, async (request, reply) => {
    if (await blockBadIp(request, reply, "account_unlock")) return;
    const body = unlockAccountSchema.parse(request.body);
    const user = await queryOne<AdminUserRow>(
      "SELECT id, username, password_hash, email, whatsapp, role, token_version, failed_login_attempts, locked_until FROM admin_users WHERE username = $1",
      [body.username]
    );

    if (!user) {
      reply.code(404).send({ message: "Admin account not found." });
      return;
    }

    const challenge = await createAdminOtpChallenge(user, body.channel as OtpChannel, "account_unlock", request, reply, app.log);
    if (!challenge) return;
    return {
      message: `Unlock OTP sent to ${challenge.destination}.`,
      ...challenge,
    };
  });

  app.post("/api/auth/unlock/verify", async (request, reply) => {
    if (await blockBadIp(request, reply, "account_unlock_verify")) return;
    const body = verifyUnlockSchema.parse(request.body);
    const challenge = await verifyOtpChallenge(body.challengeId, body.otp, "account_unlock");

    if (!challenge) {
      reply.code(401).send({ message: "Invalid or expired unlock OTP." });
      return;
    }

    await query("UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = $1", [challenge.admin_user_id]);
    await logAdminSecurityEvent(request, "account_unlocked", "Admin account unlocked by OTP.");
    return { message: "Account unlocked. You can login now." };
  });

  app.post("/api/auth/password/reset", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "15 minutes",
      },
    },
  }, async (request, reply) => {
    if (await blockBadIp(request, reply, "password_reset")) return;
    const body = resetPasswordSchema.parse(request.body);
    const challenge = await verifyOtpChallenge(body.challengeId, body.otp, "password_reset");

    if (!challenge) {
      reply.code(401).send({ message: "Invalid or expired OTP." });
      return;
    }

    await query(
      `UPDATE admin_users
       SET password_hash = $1,
           token_version = token_version + 1,
           password_changed_at = now(),
           updated_at = now()
       WHERE id = $2`,
      [await bcrypt.hash(body.newPassword, 12), challenge.admin_user_id]
    );

    return { message: "Password updated. Please login with the new password." };
  });

  app.get("/api/auth/me", { preHandler: requireAdmin }, async (request) => {
    return { user: request.user };
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    if (await blockBadIp(request, reply, "refresh")) return;
    const refreshToken = getRefreshCookie(request);
    const session = refreshToken
      ? await queryOne<AuthTokenRow>(
          `SELECT id, admin_user_id, csrf_hash, expires_at, revoked_at
           FROM auth_refresh_tokens
           WHERE token_hash = $1`,
          [hashToken(refreshToken)]
        )
      : null;
    if (!session || session.revoked_at || session.expires_at.getTime() < Date.now()) {
      reply.header("Set-Cookie", [clearCookieHeader("cw_access"), clearCookieHeader("cw_refresh")]);
      reply.code(401).send({ message: "Session expired." });
      return;
    }

    const user = await queryOne<AdminUserRow>(
      "SELECT id, username, password_hash, email, whatsapp, role, token_version, failed_login_attempts, locked_until FROM admin_users WHERE id = $1",
      [session.admin_user_id]
    );
    if (!user) {
      reply.code(401).send({ message: "Session expired." });
      return;
    }
    const accessToken = app.jwt.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.token_version,
    });
    const csrfToken = randomBytes(32).toString("base64url");
    await query("UPDATE auth_refresh_tokens SET csrf_hash = $2 WHERE id = $1", [session.id, hashToken(csrfToken)]);
    reply.header("Set-Cookie", cookieHeader("cw_access", accessToken, 24 * 60 * 60));
    return { csrfToken, user: { id: user.id, username: user.username, role: user.role } };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const refreshToken = getRefreshCookie(request);
    if (refreshToken) {
      await query("UPDATE auth_refresh_tokens SET revoked_at = now() WHERE token_hash = $1", [hashToken(refreshToken)]);
    }
    reply.header("Set-Cookie", [clearCookieHeader("cw_access"), clearCookieHeader("cw_refresh")]);
    return { message: "Logged out." };
  });

  app.post("/api/auth/logout-all", { preHandler: requireAdmin }, async (request, reply) => {
    const user = request.user as { sub?: string } | undefined;
    if (!user?.sub) {
      reply.code(401).send({ message: "Unauthorized." });
      return;
    }
    await query("UPDATE auth_refresh_tokens SET revoked_at = now() WHERE admin_user_id = $1 AND revoked_at IS NULL", [user.sub]);
    await query("UPDATE admin_users SET token_version = token_version + 1, updated_at = now() WHERE id = $1", [user.sub]);
    await logAdminSecurityEvent(request, "logout_all_devices", "Admin revoked all active sessions.");
    reply.header("Set-Cookie", [clearCookieHeader("cw_access"), clearCookieHeader("cw_refresh")]);
    return { message: "All sessions logged out." };
  });

  app.get("/api/cms/public", async () => {
    await ensureContactColumns();
    const row = await queryOne<{ content: unknown; updatedAt: Date }>(
      `SELECT content, updated_at AS "updatedAt"
       FROM cms_content
       WHERE key = 'portfolio'
       LIMIT 1`
    );
    return {
      content: row?.content || null,
      updatedAt: row?.updatedAt || null,
    };
  });

  app.get("/api/admin/cms", { preHandler: requireAdmin }, async () => {
    await ensureContactColumns();
    const row = await queryOne<{ content: unknown; updatedAt: Date }>(
      `SELECT content, updated_at AS "updatedAt"
       FROM cms_content
       WHERE key = 'portfolio'
       LIMIT 1`
    );
    return {
      content: row?.content || null,
      updatedAt: row?.updatedAt || null,
    };
  });

  app.put("/api/admin/cms", { preHandler: requireAdmin }, async (request) => {
    await ensureContactColumns();
    const body = cmsContentSchema.parse(request.body);
    const sanitizedContent = sanitizeJson(body.content);
    const previous = await queryOne<{ content: unknown }>("SELECT content FROM cms_content WHERE key = 'portfolio' LIMIT 1");
    if (previous?.content) {
      await query(
        `INSERT INTO cms_backups (label, source, content)
         VALUES ($1, 'pre-save', $2)`,
        [`Auto backup before save - ${new Date().toISOString()}`, JSON.stringify(previous.content)]
      );
    }
    const row = await queryOne<{ content: unknown; updatedAt: Date }>(
      `INSERT INTO cms_content (key, content)
       VALUES ('portfolio', $1)
       ON CONFLICT (key)
       DO UPDATE SET content = EXCLUDED.content,
                     updated_at = now()
       RETURNING content, updated_at AS "updatedAt"`,
      [JSON.stringify(sanitizedContent)]
    );
    broadcastRealtime("cms.updated", row);
    return { message: "Portfolio CMS saved.", content: row?.content, updatedAt: row?.updatedAt };
  });

  app.get("/api/admin/cms/backups", { preHandler: requireAdmin }, async () => {
    await ensureContactColumns();
    return {
      backups: await query(
        `SELECT id, label, source, restored_at AS "restoredAt", created_at AS "createdAt"
         FROM cms_backups
         ORDER BY created_at DESC
         LIMIT 100`
      ),
    };
  });

  app.post("/api/admin/cms/backups", { preHandler: requireAdmin }, async (request) => {
    await ensureContactColumns();
    const body = cmsBackupSchema.parse(request.body);
    const current = body.content
      ? sanitizeJson(body.content)
      : (await queryOne<{ content: unknown }>("SELECT content FROM cms_content WHERE key = 'portfolio' LIMIT 1"))?.content;
    const row = await queryOne<{ id: string; label: string; source: string; createdAt: Date }>(
      `INSERT INTO cms_backups (label, source, content)
       VALUES ($1, $2, $3)
       RETURNING id, label, source, created_at AS "createdAt"`,
      [body.label, body.source, JSON.stringify(current || {})]
    );
    return { message: "CMS backup created.", backup: row };
  });

  app.post("/api/admin/cms/backups/:id/restore", { preHandler: requireAdmin }, async (request, reply) => {
    await ensureContactColumns();
    const params = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const backup = await queryOne<{ content: unknown }>("SELECT content FROM cms_backups WHERE id::text = $1", [params.id]);
    if (!backup) {
      reply.code(404).send({ message: "CMS backup not found." });
      return;
    }
    const row = await queryOne<{ content: unknown; updatedAt: Date }>(
      `INSERT INTO cms_content (key, content)
       VALUES ('portfolio', $1)
       ON CONFLICT (key)
       DO UPDATE SET content = EXCLUDED.content,
                     updated_at = now()
       RETURNING content, updated_at AS "updatedAt"`,
      [JSON.stringify(backup.content)]
    );
    await query("UPDATE cms_backups SET restored_at = now() WHERE id::text = $1", [params.id]);
    broadcastRealtime("cms.updated", row);
    return { message: "CMS backup restored.", content: row?.content, updatedAt: row?.updatedAt };
  });

  app.post("/api/contact", async (request, reply) => {
    if (await blockBadIp(request, reply, "contact")) return;
    const parsedBody = contactSchema.parse(request.body);
    const body = {
      ...parsedBody,
      name: sanitizeText(parsedBody.name),
      email: sanitizeText(parsedBody.email),
      subject: parsedBody.subject ? sanitizeText(parsedBody.subject) : undefined,
      message: sanitizeText(parsedBody.message),
      source: parsedBody.source ? sanitizeText(parsedBody.source) : undefined,
      metadata: sanitizeJson(parsedBody.metadata || {}) as Record<string, unknown>,
    };
    const ip = getClientIp(request);
    const ipGeo = await getIpGeoLocation(ip);
    const ipReputation = await getIpReputation(ip);
    const metadata = {
      ...(body.metadata || {}),
      ipGeo,
      ipReputation,
    };
    const contact = await queryOne<ContactMessageRow>(
      `INSERT INTO contact_messages (name, email, subject, message, source, visitor_id, metadata, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, subject, message, source, status, pinned, visitor_id AS "visitorId", metadata, ip, user_agent AS "userAgent", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [encryptSensitive(body.name), encryptSensitive(body.email), encryptSensitive(body.subject || "Portfolio contact"), encryptSensitive(body.message), body.source || "website", body.visitorId || null, JSON.stringify(metadata), ip, request.headers["user-agent"] || null]
    ).then((row) => row ? decryptContactRow(row) : row);

    if (contact) {
      const location = [
        getIpGeoString(contact.metadata, "city"),
        getIpGeoString(contact.metadata, "state"),
        getIpGeoString(contact.metadata, "country"),
      ].filter(Boolean).join(", ") || "Unknown";

      void sendContactNotification({
        to: config.adminEmail,
        name: contact.name,
        email: contact.email,
        subject: contact.subject || "Portfolio contact",
        message: contact.message,
        ip,
        location,
        visitorId: contact.visitorId,
        createdAt: new Date(contact.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      }).catch((err) => request.log.warn({ err }, "Contact email notification failed"));
    }

    broadcastRealtime("contact.created", contact);
    broadcastRealtime("summary.updated", await getAdminSummary());
    reply.code(201).send({ message: "Contact message received.", contactId: contact?.id });
  });

  app.post("/api/analytics/event", async (request, reply) => {
    if (await blockBadIp(request, reply, "analytics")) return;
    const parsedBody = analyticsSchema.parse(request.body);
    const body = {
      ...parsedBody,
      type: sanitizeText(parsedBody.type),
      path: sanitizeText(parsedBody.path),
      metadata: sanitizeJson(parsedBody.metadata || {}) as Record<string, unknown>,
    };
    const analyticsPath = body.path.slice(0, 300);
    const ip = getClientIp(request);
    const ipGeo = await getIpGeoLocation(ip);
    const ipReputation = await getIpReputation(ip);
    const metadata = {
      ...(body.metadata || {}),
      ipGeo,
      ipReputation,
    };
    const event = await queryOne(
      `INSERT INTO analytics_events (type, path, visitor_id, metadata, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type, path, visitor_id AS "visitorId", ip, user_agent AS "userAgent", metadata, created_at AS "createdAt"`,
      [
        body.type,
        analyticsPath,
        body.visitorId || null,
        JSON.stringify(metadata),
        ip,
        request.headers["user-agent"] || null,
      ]
    );

    broadcastRealtime("analytics.created", event);
    const suspiciousReason = getSuspiciousRequestReason(analyticsPath, body.type);
    if (suspiciousReason) {
      await query(
        `INSERT INTO soc_events (title, severity, source, ip, detail)
         VALUES ($1, $2, $3, $4, $5)`,
        [suspiciousReason, analyticsPath.toLowerCase().includes("/admin") ? "high" : "medium", "visitor-monitor", ip, `${body.type} at ${analyticsPath}`]
      );
      await logAdminSecurityEvent(request, "visitor_threat_detected", suspiciousReason, analyticsPath, metadata);
    }
    broadcastRealtime("summary.updated", await getAdminSummary());
    reply.code(202).send({ message: "Analytics event captured." });
  });

  app.post("/api/visitor-log", async (request, reply) => {
    if (await blockBadIp(request, reply, "visitor_log")) return;
    const parsedBody = visitorLogSchema.parse(request.body);
    const body = sanitizeJson(parsedBody) as typeof parsedBody;
    const path = sanitizeText(body.path || (body.page ? new URL(body.page, "http://localhost").pathname : "/"));
    const ip = getClientIp(request);
    const ipGeo = await getIpGeoLocation(ip);
    const ipReputation = await getIpReputation(ip);
    const metadata = {
      ...body,
      ipGeo,
      ipReputation,
    };
    const event = await queryOne(
      `INSERT INTO analytics_events (type, path, visitor_id, metadata, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type, path, visitor_id AS "visitorId", ip, user_agent AS "userAgent", metadata, created_at AS "createdAt"`,
      [
        body.type || "visitor_log",
        path.slice(0, 300),
        body.visitorId || null,
        JSON.stringify(metadata),
        ip,
        body.userAgent || request.headers["user-agent"] || null,
      ]
    );

    broadcastRealtime("analytics.created", event);
    const suspiciousReason = getSuspiciousRequestReason(path, body.type || "visitor_log");
    if (suspiciousReason) {
      await query(
        `INSERT INTO soc_events (title, severity, source, ip, detail)
         VALUES ($1, $2, $3, $4, $5)`,
        [suspiciousReason, path.toLowerCase().includes("/admin") ? "high" : "medium", "visitor-monitor", ip, `${body.type || "visitor_log"} at ${path}`]
      );
      await logAdminSecurityEvent(request, "visitor_threat_detected", suspiciousReason, path, metadata);
    }
    broadcastRealtime("summary.updated", await getAdminSummary());
    reply.code(202).send({ message: "Visitor log captured." });
  });

  app.post("/api/privacy/export", async (request, reply) => {
    const body = privacyVisitorSchema.parse(request.body);
    const events = await query(
      `SELECT id, type, path, visitor_id AS "visitorId", metadata, created_at AS "createdAt"
       FROM analytics_events
       WHERE deleted_at IS NULL AND visitor_id = $1
       ORDER BY created_at DESC
       LIMIT 500`,
      [body.visitorId]
    );
    if (events.length === 0) {
      reply.code(404).send({ message: "No visitor records found for this browser." });
      return;
    }
    reply.send({ visitorId: body.visitorId, exportedAt: new Date().toISOString(), events });
  });

  app.post("/api/privacy/delete", async (request) => {
    const body = privacyVisitorSchema.parse(request.body);
    const deleted = await queryOne<{ count: string }>(
      `WITH updated AS (
         UPDATE analytics_events
         SET deleted_at = now(), deleted_by = 'visitor'
         WHERE deleted_at IS NULL AND visitor_id = $1
         RETURNING id
       )
       SELECT COUNT(*)::text AS count FROM updated`,
      [body.visitorId]
    );
    return { message: "Visitor records removed from active analytics.", deletedEvents: Number(deleted?.count || 0) };
  });

  app.post("/api/security/admin-route-attempt", async (request, reply) => {
    if (await blockBadIp(request, reply, "admin_route_attempt")) return;
    const parsedBody = adminRouteAttemptSchema.parse(request.body);
    const body = {
      ...parsedBody,
      path: sanitizeText(parsedBody.path),
      reason: sanitizeText(parsedBody.reason),
      metadata: sanitizeJson(parsedBody.metadata || {}) as Record<string, unknown>,
    };
    await logAdminSecurityEvent(request, "admin_route_denied", body.reason, body.path, body.metadata);
    reply.code(202).send({ message: "Admin access attempt logged." });
  });

  app.get("/api/admin/summary", { preHandler: requireAdmin }, async () => getAdminSummary());

  app.get("/api/admin/search", { preHandler: requireAdmin }, async (request) => {
    const params = searchSchema.parse(request.query);
    return { results: await getUniversalSearchResults(params.q) };
  });

  app.post("/api/admin/assistant", { preHandler: requireAdmin }, async (request) => {
    const body = assistantSchema.parse(request.body);
    return getAssistantAnswer(body.prompt);
  });

  app.get("/api/admin/security-score", { preHandler: requireAdmin }, async () => {
    const summary = await getAdminSummary();
    return getSecurityScoreDetails(summary);
  });

  app.get("/api/admin/cloudflare/status", { preHandler: requireAdmin }, async () => {
    const summary = await getAdminSummary();
    return getCloudflareStatus(summary);
  });

  app.get("/api/admin/visitors", { preHandler: requireAdmin }, async () => ({
    visitors: await getVisitorIntelligence(),
  }));

  app.get("/api/admin/visitors/trash", { preHandler: requireAdmin }, async () => ({
    visitors: await getVisitorIntelligence(true),
  }));

  app.get("/api/admin/contacts", { preHandler: requireAdmin }, async () => ({
    contacts: decryptContactRows(await query<ContactMessageRow>(
      `SELECT id, name, email, subject, message, source, status, pinned, visitor_id AS "visitorId", metadata, ip, user_agent AS "userAgent", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM contact_messages
       WHERE status <> 'archived'
       ORDER BY pinned DESC, created_at DESC
       LIMIT 200`
    )),
  }));

  app.patch("/api/admin/contacts/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const body = contactUpdateSchema.parse(request.body);
    const contact = await queryOne<ContactMessageRow>(
      `UPDATE contact_messages
       SET status = COALESCE($2, status),
           pinned = COALESCE($3, pinned),
           updated_at = now()
       WHERE id::text = $1
       RETURNING id, name, email, subject, message, source, status, pinned, visitor_id AS "visitorId", metadata, ip, user_agent AS "userAgent", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [params.id, body.status || null, body.pinned ?? null]
    );
    if (!contact) {
      reply.code(404);
      return { message: "Contact message not found." };
    }
    return { contact: decryptContactRow(contact) };
  });

  app.delete("/api/admin/contacts/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const params = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const contact = await queryOne(
      "UPDATE contact_messages SET status = 'archived', pinned = false, updated_at = now() WHERE id::text = $1 RETURNING id",
      [params.id]
    );
    if (!contact) {
      reply.code(404).send({ message: "Contact message not found." });
      return;
    }
    getAdminSummary().then((summary) => broadcastRealtime("summary.updated", summary)).catch((err) => request.log.warn({ err }, "Summary refresh failed after contact delete"));
    reply.send({ message: "Contact archived." });
  });

  app.patch("/api/admin/visitors/:visitorKey/notes", { preHandler: requireAdmin }, async (request) => {
    const params = z.object({ visitorKey: z.string().trim().min(1).max(180) }).parse(request.params);
    const parsedBody = visitorNoteSchema.parse(request.body);
    const body = {
      customName: parsedBody.customName ? sanitizeText(parsedBody.customName) : undefined,
      hostname: parsedBody.hostname ? sanitizeText(parsedBody.hostname) : undefined,
      flag: parsedBody.flag,
      notes: parsedBody.notes ? sanitizeText(parsedBody.notes) : undefined,
    };
    const note = await queryOne(
      `INSERT INTO visitor_notes (visitor_key, custom_name, hostname, flag, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (visitor_key)
       DO UPDATE SET custom_name = EXCLUDED.custom_name,
                     hostname = EXCLUDED.hostname,
                     flag = EXCLUDED.flag,
                     notes = EXCLUDED.notes,
                     updated_at = now()
       RETURNING visitor_key AS "visitorKey", custom_name AS "customName", hostname, flag, notes, updated_at AS "updatedAt"`,
      [params.visitorKey, encryptSensitive(body.customName || null), encryptSensitive(body.hostname || null), body.flag || "monitor", encryptSensitive(body.notes || null)]
    );
    return { note: note ? { ...note, customName: decryptSensitive((note as { customName?: string }).customName), hostname: decryptSensitive((note as { hostname?: string }).hostname), notes: decryptSensitive((note as { notes?: string }).notes) } : note };
  });

  app.delete("/api/admin/visitors/:visitorKey", { preHandler: requireAdmin }, async (request, reply) => {
    const params = z.object({ visitorKey: z.string().trim().min(1).max(180) }).parse(request.params);
    const queryParams = visitorDeleteSchema.parse(request.query);
    const visitorKey = params.visitorKey;
    await ensureContactColumns();

    if (queryParams.mode === "permanent") {
      const deletedEvents = await queryOne<{ count: string }>(
        `WITH deleted AS (
           DELETE FROM analytics_events
           WHERE ip = $1 OR visitor_id = $1 OR COALESCE(ip, visitor_id) = $1
           RETURNING id
         )
         SELECT COUNT(*)::text AS count FROM deleted`,
        [visitorKey]
      );
      await query("DELETE FROM visitor_notes WHERE visitor_key = $1", [visitorKey]);
      getAdminSummary().then((summary) => broadcastRealtime("summary.updated", summary)).catch((err) => request.log.warn({ err }, "Summary refresh failed after permanent visitor delete"));
      reply.send({ message: "Visitor permanently deleted.", deletedEvents: Number(deletedEvents?.count || 0) });
      return;
    }

    const trashedEvents = await queryOne<{ count: string }>(
      `WITH updated AS (
         UPDATE analytics_events
         SET deleted_at = now(), deleted_by = 'admin'
         WHERE deleted_at IS NULL AND (ip = $1 OR visitor_id = $1 OR COALESCE(ip, visitor_id) = $1)
         RETURNING id
       )
       SELECT COUNT(*)::text AS count FROM updated`,
      [visitorKey]
    );

    if (Number(trashedEvents?.count || 0) === 0) {
      reply.code(404).send({ message: "Visitor not found or already in trash." });
      return;
    }

    getAdminSummary().then((summary) => broadcastRealtime("summary.updated", summary)).catch((err) => request.log.warn({ err }, "Summary refresh failed after visitor trash"));
    reply.send({ message: "Visitor moved to trash.", trashedEvents: Number(trashedEvents?.count || 0) });
  });

  app.delete("/api/admin/visitor-events/:eventId", { preHandler: requireAdmin }, async (request, reply) => {
    const params = z.object({ eventId: z.string().trim().min(1).max(120) }).parse(request.params);
    const queryParams = visitorDeleteSchema.parse(request.query);
    await ensureContactColumns();

    if (queryParams.mode === "permanent") {
      const deleted = await queryOne<{ id: string }>("DELETE FROM analytics_events WHERE id::text = $1 RETURNING id", [params.eventId]);
      if (!deleted) {
        reply.code(404).send({ message: "Visit event not found." });
        return;
      }
      getAdminSummary().then((summary) => broadcastRealtime("summary.updated", summary)).catch((err) => request.log.warn({ err }, "Summary refresh failed after event delete"));
      reply.send({ message: "Visit event permanently deleted." });
      return;
    }

    const trashed = await queryOne<{ id: string }>(
      "UPDATE analytics_events SET deleted_at = now(), deleted_by = 'admin' WHERE id::text = $1 AND deleted_at IS NULL RETURNING id",
      [params.eventId]
    );
    if (!trashed) {
      reply.code(404).send({ message: "Visit event not found or already in trash." });
      return;
    }
    getAdminSummary().then((summary) => broadcastRealtime("summary.updated", summary)).catch((err) => request.log.warn({ err }, "Summary refresh failed after event trash"));
    reply.send({ message: "Visit event moved to trash." });
  });

  app.get("/api/admin/reports", { preHandler: requireAdmin }, async (request, reply) => {
    const params = reportSchema.parse(request.query);
    const [visitors, encryptedContacts, securityLogs, events] = await Promise.all([
      getVisitorIntelligence(),
      query<ContactMessageRow>(
        `SELECT id, name, email, subject, message, source, status, pinned, visitor_id AS "visitorId", metadata, ip, user_agent AS "userAgent", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM contact_messages
         WHERE status <> 'archived'
         ORDER BY created_at DESC
         LIMIT 500`
      ),
      query<{ id: string; eventType: string; path: string; reason: string; ip: string | null; createdAt: Date }>(
        `SELECT id, event_type AS "eventType", path, reason, ip, created_at AS "createdAt"
         FROM admin_security_logs
         ORDER BY created_at DESC
         LIMIT 500`
      ),
      query<{ id: string; type: string; path: string; visitorId: string | null; ip: string | null; createdAt: Date }>(
        `SELECT id, type, path, visitor_id AS "visitorId", ip, created_at AS "createdAt"
         FROM analytics_events
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1000`
      ),
    ]);
    const contacts = decryptContactRows(encryptedContacts);

    const rowsByType: Record<string, Array<Record<string, unknown>>> = {
      visitor: visitors.map((visitor) => ({
        visitor: visitor.customName || visitor.hostname || visitor.visitorKey,
        ip: visitor.ip,
        country: visitor.country,
        city: visitor.city,
        device: visitor.device,
        browser: visitor.browser,
        os: visitor.os,
        sessions: visitor.sessions.length,
        events: visitor.eventCount,
        threatScore: visitor.threatScore,
        lastVisit: visitor.lastVisit,
      })),
      security: securityLogs.map((log) => ({
        event: log.eventType,
        reason: log.reason,
        path: log.path,
        ip: log.ip,
        time: log.createdAt,
      })),
      contact: contacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
        status: contact.status,
        ip: contact.ip,
        visitorId: contact.visitorId,
        time: contact.createdAt,
      })),
      resume: events.filter((event) => event.type === "resume_download").map((event) => ({
        visitorId: event.visitorId,
        ip: event.ip,
        path: event.path,
        time: event.createdAt,
      })),
      projects: events.filter((event) => event.type === "project_click").map((event) => ({
        visitorId: event.visitorId,
        ip: event.ip,
        path: event.path,
        time: event.createdAt,
      })),
      monthly: [
        { metric: "Visitors", value: visitors.length },
        { metric: "Contacts", value: contacts.length },
        { metric: "Security logs", value: securityLogs.length },
        { metric: "Events", value: events.length },
      ],
    };

    const selectedFields = params.fields ? params.fields.split(",").map((field) => field.trim()).filter(Boolean) : [];
    const rows = selectedFields.length
      ? rowsByType[params.type].map((row) => Object.fromEntries(selectedFields.map((field) => [field, row[field] ?? ""])))
      : rowsByType[params.type];
    if (params.format === "csv" || params.format === "excel") {
      const csv = toCsv(rows);
      const extension = params.format === "excel" ? "xls" : "csv";
      reply.header("Content-Type", params.format === "excel" ? "application/vnd.ms-excel" : "text/csv");
      reply.header("Content-Disposition", `attachment; filename="cipherwolf-${params.type}-report.${extension}"`);
      reply.send(csv);
      return;
    }

    if (params.format === "pdf") {
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="cipherwolf-${params.type}-report.pdf"`);
      reply.send(buildSimplePdf(`CipherWolf ${params.type} report`, rows));
      return;
    }

    reply.send({ type: params.type, generatedAt: new Date().toISOString(), rows });
  });

  app.get("/api/realtime", { websocket: true }, async (socket, request) => {
    const url = new URL(request.url || "/", "http://localhost");
    const token = request.headers.authorization?.replace("Bearer ", "") || url.searchParams.get("token") || getAuthCookie(request) || "";
    if (!token) {
      socket.close(1008, "Unauthorized");
      return;
    }

    try {
      const payload = app.jwt.verify<{ sub: string; tokenVersion: number }>(token);
      const user = await queryOne<{ token_version: number }>("SELECT token_version FROM admin_users WHERE id = $1", [payload.sub]);
      if (!user || user.token_version !== payload.tokenVersion) {
        socket.close(1008, "Unauthorized");
        return;
      }

      addRealtimeClient(socket);
      socket.send(JSON.stringify({ type: "connected", payload: { ok: true }, sentAt: new Date().toISOString() }));
      socket.send(JSON.stringify({ type: "summary.updated", payload: await getAdminSummary(), sentAt: new Date().toISOString() }));
    } catch {
      socket.close(1008, "Unauthorized");
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      reply.code(400).send({ message: "Invalid request data.", issues: error.issues });
      return;
    }

    app.log.error(error);
    reply.code(500).send({ message: process.env.NODE_ENV === "production" ? "Unexpected server error." : error instanceof Error ? error.message : "Unexpected server error." });
  });

  return app;
}
