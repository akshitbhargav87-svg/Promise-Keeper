-- Promise Keeper: Migration 0001_initial_schema.sql
-- Establishes global workspace, user, session, jobs, outbox, and RLS scaffolding

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_memberships_workspace_user UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace_id);

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL,
  scopes TEXT NOT NULL,
  consent_version INT NOT NULL DEFAULT 1,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_consents_workspace ON consents(workspace_id, provider);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  priority TEXT NOT NULL DEFAULT 'normal',
  attempt INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  lease_owner TEXT,
  leased_until TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key TEXT,
  correlation_id TEXT,
  payload TEXT NOT NULL,
  result TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_jobs_workspace_idempotency UNIQUE(workspace_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_jobs_workspace ON jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_priority ON jobs(status, priority, next_attempt_at);

CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id UUID NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  aggregate_version INT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_workspace ON outbox(workspace_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, created_at);

-- RLS Scaffolding (A09 Review Input)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS tenant_isolation_jobs ON jobs
  USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::UUID);

ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS tenant_isolation_outbox ON outbox
  USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::UUID);
