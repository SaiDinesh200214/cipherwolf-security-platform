# CipherWolf Backend Architecture

## Final Stack

- Runtime: Node.js with TypeScript
- API framework: Fastify
- Main database: PostgreSQL
- Realtime layer: Fastify WebSocket endpoint
- Speed/cache layer: Redis is included in Docker for the next phase
- Auth: JWT access token plus bcrypt password hashing
- OTP: 6-digit challenge, stored as a hash, expires after 5 minutes
- OTP delivery: Gmail SMTP for email, Twilio WhatsApp for WhatsApp
- Validation: Zod request schemas
- Security middleware: Helmet, CORS, API rate limiting

PostgreSQL is the final main database choice. It fits login, visitors, SOC events, analytics, and CRM better than MongoDB because those modules will need reliable relations, filters, counts, dashboards, and reporting.

## Current Backend Modules

1. Health check: `GET /api/health`
2. Admin login OTP request: `POST /api/auth/login`
3. Admin login OTP verification: `POST /api/auth/login/verify`
4. Forgot password OTP request: `POST /api/auth/password/forgot`
5. Password reset: `POST /api/auth/password/reset`
6. Current admin session: `GET /api/auth/me`
7. Contact form capture: `POST /api/contact`
8. Visitor analytics capture: `POST /api/analytics/event`
9. Admin summary: `GET /api/admin/summary`
10. Realtime admin socket: `GET /api/realtime`

During local development, OTPs are logged in the backend terminal if SMTP or Twilio credentials are not configured. Email delivery is ready for Gmail SMTP app passwords. WhatsApp delivery is ready for Twilio WhatsApp credentials.

## Build Order

1. Complete login and session protection.
2. Complete admin dashboard shell and live summary cards.
3. Add visitors module with page views, unique visitors, device/browser data, and realtime updates.
4. Add SOC dashboard with threat events, severity scoring, filters, and alerts.
5. Add CMS for blog, projects, services, and homepage content.
6. Add CRM last: leads, pipeline status, notes, tasks, and follow-ups.

This order keeps the platform stable because every later module depends on secure login, database persistence, and admin dashboard access.
