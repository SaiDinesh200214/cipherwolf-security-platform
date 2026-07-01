# Deployment Guide

## Required Production Values

Set these before public-network testing:

- `NODE_ENV=production`
- `FRONTEND_ORIGIN=https://your-domain.com`
- `POSTGRES_PASSWORD=<strong password>`
- `JWT_SECRET=<32+ random characters>`
- `DATA_ENCRYPTION_KEY=<separate 32+ random characters>`
- `ADMIN_USERNAME=<non-default username>`
- `ADMIN_PASSWORD=<long random password>`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=lax` for same-site reverse proxy, or `none` only when cross-site cookies are required over HTTPS

Optional:

- SMTP/Twilio values for OTP and contact notifications
- `IP_REPUTATION_PROVIDER=abuseipdb` and `IP_REPUTATION_API_KEY`
- Cloudflare zone/account/token values for dashboard status

## Docker Deployment

1. Copy `.env.example` to `.env`.
2. Fill every required value.
3. Run `docker compose up --build`.
4. Confirm `https://your-domain.com/api/health` returns `ok: true`.
5. Log in to `/admin` and verify OTP, dashboard, contacts, visitor tracking, reports, search, and Cipher AI.

## Recommended Network Path

Cloudflare -> Nginx -> React frontend / Fastify API -> Postgres

Cloudflare should provide DNS, SSL, DDoS protection, WAF, bot protection, caching, and rate limiting. Nginx handles reverse proxying, compression, static asset serving, security headers, upload limits, and websocket forwarding.

## Smoke Test Checklist

- Frontend loads over HTTPS.
- `/api/health` is healthy.
- Admin login requires OTP.
- Contact form creates a message.
- Visitor events appear in the admin dashboard.
- `Ctrl/Command + K` opens universal search.
- Cipher AI answers visitor/security/report prompts.
- Reports export as JSON/CSV/PDF.
- Privacy export/delete endpoints work for the current visitor ID.
- Cloudflare shows SSL/WAF/DDoS enabled.

## Not Yet Enterprise Production Complete

Before a large public launch, add CI/CD, external monitoring, database backups, restore drills, structured logs, versioned database migrations, load testing, and a written incident response process.
