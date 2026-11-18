CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton), -- DB-level one-admin rule
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(150) NOT NULL,
  template_code VARCHAR(80) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  subject VARCHAR(300) NOT NULL,
  html_body TEXT NOT NULL,
  plain_text_body TEXT NOT NULL DEFAULT '',
  placeholders JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_templates_status ON email_templates(status);
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  template_id INT REFERENCES email_templates(id) ON DELETE SET NULL,
  template_name VARCHAR(150),
  template_code VARCHAR(80),
  recipient_to JSONB NOT NULL DEFAULT '[]',
  recipient_cc JSONB NOT NULL DEFAULT '[]',
  recipient_bcc JSONB NOT NULL DEFAULT '[]',
  subject VARCHAR(300) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','sent','partially_failed','failed')),
  message_id TEXT,
  error_message TEXT,
  is_test BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_status ON email_logs(status, is_test);
