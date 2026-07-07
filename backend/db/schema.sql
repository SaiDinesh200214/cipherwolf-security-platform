CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email VARCHAR(180),
  whatsapp VARCHAR(40),
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  token_version INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(180);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(40);
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS administrative_pin_hash TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS administrative_pin_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS auth_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  purpose VARCHAR(40) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_admin_user_id ON auth_otps (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires_at ON auth_otps (expires_at);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  csrf_hash TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_admin_user_id ON auth_refresh_tokens (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens (expires_at);

CREATE TABLE IF NOT EXISTS admin_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(80) NOT NULL,
  path VARCHAR(300) NOT NULL,
  reason VARCHAR(200) NOT NULL,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_security_logs_created_at ON admin_security_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_security_logs_event_type ON admin_security_logs (event_type);

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'website',
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS subject VARCHAR(240);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(120);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(80) NOT NULL,
  path VARCHAR(300) NOT NULL,
  visitor_id VARCHAR(120),
  ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(120);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(80);

CREATE TABLE IF NOT EXISTS visitor_notes (
  visitor_key VARCHAR(180) PRIMARY KEY,
  custom_name VARCHAR(160),
  hostname VARCHAR(160),
  flag VARCHAR(30) NOT NULL DEFAULT 'monitor',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soc_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'low',
  source VARCHAR(120) NOT NULL,
  ip TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  company VARCHAR(160),
  phone VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_content (
  key VARCHAR(80) PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(180) NOT NULL,
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  content JSONB NOT NULL,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_backups_created_at ON cms_backups (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ip ON analytics_events (ip);
CREATE INDEX IF NOT EXISTS idx_analytics_events_deleted_at ON analytics_events (deleted_at);
CREATE INDEX IF NOT EXISTS idx_soc_events_created_at ON soc_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soc_events_severity ON soc_events (severity);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads (status);
