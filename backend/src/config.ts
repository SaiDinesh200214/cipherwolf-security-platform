import "dotenv/config";

const production = process.env.NODE_ENV === "production";
const insecureDefaults = new Set([
  "dev-only-change-this-secret",
  "replace-with-a-long-random-secret",
  "replace-with-a-separate-long-random-encryption-key",
  "SaiTeju@140515",
  "cipherwolf",
  "cipherwolf25.18.00@gmail.com",
  "postgresql://cipherwolf:cipherwolf@localhost:5432/cipherwolf_security?schema=public",
]);

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function requireProductionEnv(name: string, fallback?: string, minimumLength = 1): string {
  const value = requireEnv(name, fallback);
  if (production) {
    if (insecureDefaults.has(value) || value.length < minimumLength) {
      throw new Error(`${name} must be set to a strong production value.`);
    }
  }
  return value;
}

function optionalProductionEnv(name: string, fallback = ""): string {
  const value = process.env[name] || fallback;
  if (production && insecureDefaults.has(value)) {
    throw new Error(`${name} must not use a development default in production.`);
  }
  return value;
}

const frontendOrigin = requireProductionEnv("FRONTEND_ORIGIN", "http://localhost:5173");

if (production && frontendOrigin === "*") {
  throw new Error("FRONTEND_ORIGIN cannot be * in production when credentials are enabled.");
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendOrigin,
  databaseUrl: requireProductionEnv("DATABASE_URL", "postgresql://cipherwolf:cipherwolf@localhost:5432/cipherwolf_security?schema=public"),
  jwtSecret: requireProductionEnv("JWT_SECRET", "dev-only-change-this-secret", 32),
  dataEncryptionKey: requireProductionEnv("DATA_ENCRYPTION_KEY", process.env.JWT_SECRET || "dev-only-change-this-secret", 32),
  tokenTtl: process.env.TOKEN_TTL || "1d",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14),
  cookieSecure: process.env.COOKIE_SECURE === "true" || production,
  cookieSameSite: (process.env.COOKIE_SAMESITE || "lax") as "lax" | "strict" | "none",
  ipBlocklist: (process.env.IP_BLOCKLIST || "").split(",").map((ip) => ip.trim()).filter(Boolean),
  ipReputationProvider: process.env.IP_REPUTATION_PROVIDER || "",
  ipReputationApiKey: process.env.IP_REPUTATION_API_KEY || "",
  adminUsername: requireProductionEnv("ADMIN_USERNAME", "cipherwolf", 4),
  adminPassword: requireProductionEnv("ADMIN_PASSWORD", "SaiTeju@140515", 14),
  adminEmail: optionalProductionEnv("ADMIN_EMAIL", ""),
  adminWhatsapp: optionalProductionEnv("ADMIN_WHATSAPP", ""),
  otpProvider: process.env.OTP_PROVIDER || "smtp-twilio",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE !== "false",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || "",
  cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID || "",
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN || "",
};
