CREATE TABLE IF NOT EXISTS external_sources (
  id SERIAL PRIMARY KEY, source_name VARCHAR(100) NOT NULL, api_url TEXT NOT NULL UNIQUE, http_method VARCHAR(10) NOT NULL DEFAULT 'GET',
  is_active BOOLEAN NOT NULL DEFAULT TRUE, last_synced_at TIMESTAMPTZ, last_sync_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO external_sources (source_name, api_url) VALUES ('JSONPlaceholder', 'https://jsonplaceholder.typicode.com/users') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS external_users (
  id SERIAL PRIMARY KEY, source_id INT NOT NULL REFERENCES external_sources(id) ON DELETE CASCADE, external_user_id INT NOT NULL,
  display_name VARCHAR(200) NOT NULL, email VARCHAR(255), raw_data JSONB NOT NULL, synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (source_id, external_user_id));
CREATE TABLE IF NOT EXISTS global_placeholders (
  id SERIAL PRIMARY KEY, placeholder_key VARCHAR(60) NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '',
  source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('manual','api')), placeholder_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS placeholder_mappings (
  id SERIAL PRIMARY KEY, source_id INT NOT NULL REFERENCES external_sources(id) ON DELETE CASCADE,
  placeholder_id INT NOT NULL UNIQUE REFERENCES global_placeholders(id) ON DELETE CASCADE, response_path VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
