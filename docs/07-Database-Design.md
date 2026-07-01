# CipherWolf Database Design

## Database

CipherWolf uses PostgreSQL as the primary database. The local schema is stored in:

`backend/db/schema.sql`

## Tables

- `admin_users`: secure admin accounts with bcrypt password hashes.
- `auth_otps`: hashed 6-digit OTP challenges for login and password reset.
- `contact_messages`: public contact form messages.
- `analytics_events`: visitor and page activity events.
- `soc_events`: security/threat events for the SOC dashboard.
- `crm_leads`: future CRM leads and pipeline data.

## Realtime Data

Realtime dashboard updates are sent from the backend WebSocket route when new contact or analytics events are created. Redis is included in Docker so the realtime layer can later scale across multiple backend processes.

## Local Development

Start the database services:

```bash
docker compose up -d postgres redis
```

Create tables:

```bash
cd backend
npm run db:init
```

Run the backend:

```bash
npm run dev
```
