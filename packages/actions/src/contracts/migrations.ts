/**
 * SQL migration definitions contributed by A08 (Actions & Reminders)
 * Conforming to multi-tenant workspace isolation requirements from ARCHITECTURE.md.
 */

export const A08_SQL_MIGRATIONS = `
-- Table: reminder_rules
CREATE TABLE IF NOT EXISTS reminder_rules (
    workspace_id UUID NOT NULL,
    id UUID NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID NOT NULL,
    title TEXT NOT NULL,
    deadline_raw TEXT,
    deadline_precision VARCHAR(16) NOT NULL, -- 'exact', 'estimated', 'unknown'
    deadline_kind VARCHAR(32) NOT NULL,
    deadline_date TIMESTAMPTZ,
    deadline_timezone VARCHAR(64),
    lead_time_minutes INTEGER NOT NULL DEFAULT 1440,
    channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
    quiet_hours JSONB NOT NULL DEFAULT '{"enabled": false}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id)
);

-- Table: reminder_occurrences
CREATE TABLE IF NOT EXISTS reminder_occurrences (
    workspace_id UUID NOT NULL,
    occurrence_id VARCHAR(128) NOT NULL,
    rule_id UUID NOT NULL,
    target_id UUID NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    target_scheduled_utc TIMESTAMPTZ NOT NULL,
    adjusted_delivery_utc TIMESTAMPTZ NOT NULL,
    channel VARCHAR(32) NOT NULL,
    -- External delivery transport receipts
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    external_receipt_id TEXT,
    delivery_attempted_at TIMESTAMPTZ,
    failure_reason TEXT,
    -- In-app user interaction state (strictly separate from delivery receipt)
    in_app_state VARCHAR(32) NOT NULL DEFAULT 'unread',
    read_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    deadline_precision VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, occurrence_id),
    FOREIGN KEY (workspace_id, rule_id) REFERENCES reminder_rules(workspace_id, id) ON DELETE CASCADE
);

-- Table: cases
CREATE TABLE IF NOT EXISTS cases (
    workspace_id UUID NOT NULL,
    id UUID NOT NULL,
    brand_id UUID NOT NULL,
    brand_name TEXT NOT NULL,
    case_type VARCHAR(64) NOT NULL,
    stage VARCHAR(32) NOT NULL DEFAULT 'to_prepare',
    linked_promise_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    linked_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    disputed_amount_minor BIGINT NOT NULL,
    disputed_amount_currency VARCHAR(3) NOT NULL,
    expected_amount_minor BIGINT NOT NULL,
    expected_amount_currency VARCHAR(3) NOT NULL,
    facts JSONB NOT NULL DEFAULT '[]'::jsonb,
    unanswered_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    contact_source JSONB NOT NULL,
    desired_outcome TEXT NOT NULL,
    next_follow_up_date JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id)
);

-- Table: case_drafts
CREATE TABLE IF NOT EXISTS case_drafts (
    workspace_id UUID NOT NULL,
    case_id UUID NOT NULL,
    version INTEGER NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    tone VARCHAR(32) NOT NULL DEFAULT 'formal_legal',
    language VARCHAR(16) NOT NULL DEFAULT 'en-IN',
    recipient JSONB NOT NULL,
    cited_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    desired_outcome TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, case_id, version),
    FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE CASCADE
);

-- Table: case_sent_reports (Self-report distinct from export)
CREATE TABLE IF NOT EXISTS case_sent_reports (
    workspace_id UUID NOT NULL,
    case_id UUID NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    channel VARCHAR(64),
    external_reference_number TEXT,
    confirmation_evidence_id UUID,
    recorded_by_user_id UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, case_id),
    FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE CASCADE
);

-- Table: case_outcomes (Partial/full resolution)
CREATE TABLE IF NOT EXISTS case_outcomes (
    workspace_id UUID NOT NULL,
    case_id UUID NOT NULL,
    disputed_minor BIGINT NOT NULL,
    disputed_currency VARCHAR(3) NOT NULL,
    recovered_minor BIGINT NOT NULL,
    recovered_currency VARCHAR(3) NOT NULL,
    remaining_minor BIGINT NOT NULL,
    remaining_currency VARCHAR(3) NOT NULL,
    status VARCHAR(32) NOT NULL,
    resolution_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolution_notes TEXT,
    PRIMARY KEY (workspace_id, case_id),
    FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE CASCADE
);

-- Table: evidence_pack_manifests
CREATE TABLE IF NOT EXISTS evidence_pack_manifests (
    workspace_id UUID NOT NULL,
    pack_id UUID NOT NULL,
    case_id UUID NOT NULL,
    title TEXT NOT NULL,
    accessible_text_summary TEXT NOT NULL,
    entries JSONB NOT NULL DEFAULT '[]'::jsonb,
    manifest_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, pack_id),
    FOREIGN KEY (workspace_id, case_id) REFERENCES cases(workspace_id, id) ON DELETE CASCADE
);
`;
