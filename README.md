# CipherWolf Security Platform

CipherWolf is a portfolio plus admin security dashboard with visitor analytics, contact intake, SOC-style events, reports, realtime activity, and admin OTP login.

## Deployment Readiness

The app is prepared for controlled real-network testing after you set real production values in `.env`:

- Strong `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`
- Real `FRONTEND_ORIGIN`, for example `https://your-domain.com`
- Strong `POSTGRES_PASSWORD`
- SMTP or Twilio values if OTP/contact notifications should leave the server
- Cloudflare DNS/SSL/WAF in front of the host

Production startup blocks weak default secrets.

## Run With Docker

Copy `.env.example` to `.env`, fill the required values, then run:

```bash
docker compose up --build
```

Services:

- `nginx`: public reverse proxy on ports `80` and `443`
- `frontend`: built React app
- `backend`: Fastify API
- `postgres`: production database
- `redis`: reserved for rate limiting/session coordination

## Local Development

```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix backend run dev
npm --prefix frontend run dev
```

## Checks

```bash
npm test
```

This runs frontend lint plus backend and frontend production builds.

## Cloudflare

Use Cloudflare for DNS, SSL/TLS, CDN, DDoS protection, WAF, bot protection, rate limiting, and caching. Keep SSL mode at `Full` or `Full (strict)` when Nginx has a certificate.

The admin dashboard includes a Cloudflare status panel. It shows connected status after `CLOUDFLARE_ZONE_ID` plus account/token values are configured.
