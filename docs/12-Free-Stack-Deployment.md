# Free Stack Deployment

This runbook is for controlled real-network testing with GitHub, Supabase PostgreSQL, Render, Vercel, and Resend. Keep real secret values only in provider dashboards.

## 1. Supabase

1. Open the CipherWolf Supabase project.
2. Copy a Postgres connection string for the app backend.
3. Prefer the pooler/session connection string if Supabase offers one.
4. Make sure the copied URL includes SSL, for example `?sslmode=require`.
5. Save this value for Render as `DATABASE_URL`.

## 2. Render Backend

Create a Render **Web Service** from the GitHub repository:

- Repository: `SaiDinesh200214/cipherwolf-security-platform`
- Root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

You can also use the root `render.yaml` Blueprint. Values marked `sync: false` must still be entered in Render manually.

Set these Render environment variables:

```bash
NODE_ENV=production
DATABASE_URL=<supabase-postgres-url-with-sslmode-require>
FRONTEND_ORIGIN=<vercel-frontend-url>
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<strong-admin-password>
JWT_SECRET=<32-plus-random-characters>
DATA_ENCRYPTION_KEY=<different-32-plus-random-characters>
COOKIE_SECURE=true
COOKIE_SAMESITE=none
TOKEN_TTL=1d
REFRESH_TOKEN_TTL_DAYS=14
OTP_PROVIDER=smtp-twilio
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=<resend-api-key>
SMTP_FROM=<verified-resend-sender>
```

After deployment, check:

```text
https://<your-render-service>.onrender.com/api/health
```

## 3. Vercel Frontend

Import the GitHub repository into Vercel:

- Repository: `SaiDinesh200214/cipherwolf-security-platform`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set this Vercel environment variable:

```bash
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
```

After Vercel creates the final frontend URL, copy it back to Render as `FRONTEND_ORIGIN`, then redeploy the Render service.

## 4. Verification

- Backend health endpoint returns a healthy JSON response.
- Frontend loads from Vercel.
- Contact form submits and delivers through Resend.
- Admin login works with the production admin credentials.
- Admin dashboard requests succeed without CORS, cookie, or session refresh errors.

## Current Tooling Notes

- Vercel account access is connected, but no Vercel project was visible through the tool at the time this runbook was added.
- Supabase account access is connected, but no Supabase project was visible through the tool at the time this runbook was added.
- Render has no connected automation tool in this workspace, so Render values must be entered in the dashboard.
