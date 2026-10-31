# Architecture and implementation boundaries

Read PRODUCT.md first. This describes the chosen baseline, not an already running system. Pin exact versions during A01-T01 using current official release documentation and a clean build.

## System topology

```text
Browser / responsive PWA
        | authenticated HTTPS (same origin)
Next.js web + domain API ---- OIDC identity provider
        |                   (sign-in is separate from mail consent)
        +-- PostgreSQL: domain data, sessions, jobs, outbox, search
        +-- private S3-compatible object storage: immutable originals/derivatives
        +-- Node worker: scan, parse, extract, compare, sync, remind, export, purge
                    +-- Gmail / Microsoft Graph (delegated read access)
                    +-- configured Gemma inference adapter (hosted OR self-hosted)
                    +-- opt-in notification delivery provider
```

## Planned monorepo

| Path | Contents | Primary owner |
| --- | --- | --- |
| `apps/web/src/app/` | Route composition; each feature owns its routes | A02 shell, feature routes per area |
| `apps/web/src/features/capture/`, `evidence/`, `connections/` | Capture/review/vault/connector UI and handlers | A03 |
| `apps/web/src/features/promises/`, `brands/` | Domain lists/details/editor | A05 |
| `apps/web/src/features/subscriptions/`, `offers/`, `reports/` | Subscription/offer/report UI and handlers | A06 |
| `apps/web/src/features/assistant/`, `search/` | Conversation and search UI | A07 |
| `apps/web/src/features/actions/`, `notifications/`, `calendar/` | Cases, reminders, notification UI | A08 |
| `apps/web/src/features/account/`, `privacy/`, `onboarding/` | Identity, settings, consent and lifecycle UI | A09 |
| `apps/web/src/features/ops/`, `help/`, `demo/` | Operator UI, help and demo | A10 |
| `apps/web/src/server/` | Shared request dispatch, dependency wiring | A01; changes requested by feature owners |
| `apps/worker/src/` | Worker boot, registry, lifecycle | A01 |
| `packages/ui/` | Primitives, tokens, layout, story examples | A02 |
| `packages/contracts/` | Shared runtime schemas and generated types | A01, with recorded domain-owner review |
| `packages/db/` | DB client, migration runner, global constraints | A01 |
| `packages/runtime/` | Jobs, outbox, storage ports, clock, config | A01 |
| `packages/ingestion/` | Parsers, source adapters, evidence orchestration | A03 |
| `packages/intelligence/` | Model adapters, extraction/comparison, evals | A04 |
| `packages/promises/` | Promise/brand services and domain schema contributions | A05 |
| `packages/commerce/` | Subscriptions/offers/reports | A06 |
| `packages/assistant/` | Grounded retrieval and tool proposals | A07 |
| `packages/actions/` | Reminder/case/notification/export services | A08 |
| `packages/access/` | Principal, policy checks, sessions, consent, retention | A09 |
| `fixtures/` | Sanitized contract examples; root baseline provided now | Domain owner; breaking edits reviewed by A01 |
| `tests/integration/`, `tests/e2e/`, `infra/` | Cross-area testing, containers, deployment | A10 |
| `scripts/coord.py`, `scripts/check_repo.py`, `tests/test_coord.py` | Planning/coordinator tools | Maintainer/A10 |

Within each feature, co-locate route handlers, service adapters, tests, and UI when practical. Route files should import a feature entry point, not contain another area's business rules. A01 creates a typed registration mechanism so features can add route/job registrations through owned manifests; one giant shared switch statement is forbidden. A02 owns the root layout; other areas add route files within their allocated route groups without editing it.

## Runtime choices

- Web: Next.js/React/TypeScript, app routes, semantic HTML, accessible primitives selected by A02. APIs are ordinary authenticated HTTP with shared schemas. Browser never connects directly to privileged storage or database.
- Forms/state: server state through one agreed query library, local form state through one agreed schema-aware form library. A01/A02 choose once and pin. URL owns shareable filters. Do not install a new state library per feature.
- DB: PostgreSQL with Drizzle as typed query/migration tooling. A01 validates current compatibility and pins exact versions. Prefer explicit SQL constraints and transactions over application-only uniqueness.
- Jobs: PostgreSQL job table with `FOR UPDATE SKIP LOCKED`, attempt/lease/next_attempt_at/dead_letter state and bounded retries. A01 may adopt a maintained PostgreSQL job library after an ADR if it preserves the contract. No process-local timers as durable scheduling.
- Storage: S3 API, private bucket; MinIO or equivalent local service for self-host development. Browser receives narrowly scoped short-lived upload/download grants after authorization. Server verifies stored size/content/hash before processing.
- Search: PostgreSQL full-text and normalized references first; optional pgvector embedding index is derived and can be rebuilt. Scope predicates apply before lexical/vector ranking, not after retrieval.
- Model: `GemmaAdapter` interface; Gemini API default model `gemma-4-26b-a4b-it`, validated at startup or capability probe. Self-hosted adapter explicitly configured. No assumption that every API supports the same JSON/tool features.
- Authentication: Auth.js with an explicitly configured OIDC provider and database-backed sessions, evaluated/pinned during A09-T01. If current compatibility fails, record the replacement ADR before adopting it. Authentication ports remain stable.
- Delivery: SMTP/provider adapter for opt-in alerts; default local sink in development. Case drafts use exports/client compose, no server send permission.
- Packaging: Node version and package manager pinned by A01, one root lockfile. Containerized web/worker plus Postgres/storage/scanner in a self-host Compose profile; hosting provider remains a deployment decision.

## Data model

All user-owned rows include `workspace_id`, `id`, `created_at`, `updated_at`, and `version` where mutable. Foreign keys reference `(workspace_id, id)` to make cross-tenant links impossible. IDs are server-generated UUIDs. Financial values use integer minor-unit strings at the JSON boundary to avoid JS integer precision loss; Postgres stores bigint with currency and exponent validated together. UI parses through a shared Money type, never `parseFloat` arithmetic.

| Entity | Important fields and relationships |
| --- | --- |
| users/workspaces/memberships | Identity, personal workspace, role, locale/timezone; membership supports future sharing but UI is personal in v1 |
| sessions/consents | Revocable sessions, purpose/provider/scope, consent version, granted/revoked timestamps |
| brands/brand_aliases | Name/domain/category, alias provenance, redirects/merge history |
| source_connections | Provider, account ref, encrypted token refs, status, scopes, consent ref, generation/revocation version, cursors |
| sync_runs/source_messages | Connection version, provider message ID, folder/history state, bounded backfill, dedup keys, source dates |
| evidence/evidence_assets | Origin/type/hash/size/MIME, immutable original key, scan state, retention state, derived OCR/redaction parent/version |
| evidence_spans | Evidence asset/version, page, text offsets or normalized image rectangle, excerpt, extraction method |
| extraction_runs/candidates | Model/provider/prompt/schema versions, input IDs, validated output, review issues, retry history, candidate children |
| promises/promise_terms | Brand/title/category/lifecycle, money, deadline rule, original wording, conditions, review status, append-only term revisions |
| record_evidence_links | Scoped target, evidence span, relationship, original/reviewed provenance |
| observations/comparisons | Observed money/period/tax, selected promise version, result/delta, missing info, confirmation/dismissal reason |
| subscriptions/billing_schedules/charges | Status, trial/renewal/cutoff, effective schedules, source-backed or predicted charges |
| offers/offer_conditions/redemptions | Benefit/cap/minimum, eligibility facts, separate dates, use record, linked cashback promise |
| reminder_rules/reminder_occurrences | Target, date semantics, channel/timezone, quiet hours, occurrence dedup key, delivery state |
| cases/case_events/drafts | Fact summary, requested outcome, recipients' provenance, editable draft revisions, sent self-report, follow-up/resolution |
| conversations/messages/tool_proposals | Thread scope, citation refs, assistant output, proposed writes, expiry, confirmed revision/idempotency key |
| notifications/deliveries | In-app state, channel, outbox ref, provider receipt, retry and dedup metadata |
| timeline_events/audit_events | Domain-facing history versus security audit; sanitized actors/refs, occurrence/recorded dates |
| jobs/outbox/idempotency_keys | Durable async state, transactionally emitted domain events, request dedup and replay results |
| export_jobs/deletion_jobs | Scope, redaction manifest, private output refs/expiry, purge status and backup tombstones |

No generalized polymorphic foreign key without an enforced target registry. A01 and domain owners choose link tables per target or a constrained resource registry to preserve referential integrity.

## Migration ownership

Domain owners contribute declarations under `packages/<domain>/schema/` and migration proposals under `packages/db/proposals/<area>-<task>/`. A01 assigns the next global migration sequence and generates the consolidated migration in a dedicated integration PR. Do not generate conflicting sequence numbers concurrently. Schema proposals can be exercised against disposable per-area databases before integration. Expand/contract for compatible deployments; a migration's rollback or forward-repair strategy accompanies it. No automatic destructive production migration on web startup.

## Request and transaction flow

1. Resolve an authenticated server principal from the session. Never infer workspace from JSON or AI output.
2. Validate params/body against the contract and authorize capability/resource.
3. Validate current resource revision (`If-Match` or explicit `expectedVersion`) and idempotency key for creates/actions.
4. Apply domain writes and outbox/timeline events in one database transaction.
5. Respond with version and request ID. Long jobs return 202 and a job ID.
6. Worker consumes outbox/job, rechecks principal/connection generation and retention state, acquires a bounded lease, calls adapters, stores results, then checkpoints.

Job payloads contain scoped IDs and version refs, not raw documents or OAuth tokens. Expired leases are reclaimable; cancellation is cooperative before external calls and before committing results. Retries back off with jitter, obey `Retry-After`, and stop after configured attempts; permanent permission/format errors go to actionable failure immediately. At-least-once jobs require idempotent writes; do not claim exactly-once delivery.

## Ingestion pipeline

Upload grant → finalize/verify bytes → private quarantine → malware scan → format-aware safe parser → OCR/text asset → extraction → candidate review. PDFs rasterize in a sandbox with page/pixel/time limits and no network. EML/MIME parsing does not render active HTML or fetch remote media. Hash dedup is workspace-scoped. Decompression bombs, excessive pages, and unsupported encodings fail with understandable reasons.

Email adapter receives a provider notification, verifies it, queues incremental fetch, and stores message IDs atomically with candidate work. Cursor advances only after the relevant page is durable. Gmail watch renewal/reconciliation and Graph folder delta/subscription renewal are independent jobs. Token refresh is single-flight per connection; revoked consent invalidates the connection generation and every queued job checks that generation. A history gap creates a bounded re-sync rather than treating missed data as “no changes.”

## AI safety and reliability boundary

Source documents and extracted text are data inside a clearly delimited task context. They cannot choose tools, grant consent, or override system policy. Extractor outputs a strict candidate schema; business service validates references/spans/money/deadlines. One bounded repair attempt may correct malformed JSON; repeated invalid output becomes a reviewable failure, not a guessed success.

Model invocation records provider, model ID, capability profile, prompt/schema versions, duration, token/cost metadata if supplied, and source IDs. Do not retain hidden reasoning. Raw prompts/responses containing personal data follow an explicit retention policy and are disabled in routine logs. Use cited answer snippets for user-facing provenance rather than raw provider dumps.

Grounded assistant: authorized retrieval → bounded context → answer/citations → validate citations against retrieved evidence → optional proposed action. Tool executor is ordinary domain code with per-tool schemas, scope, permission, consent, current-version checks, and idempotency. Arbitrary SQL, code execution, generic HTTP fetch, and model-selected recipients are not tools. Server uses a fixed allowlist and budgets calls/time/tokens. A tool proposal expires after 15 minutes or a relevant record revision/consent change, whichever comes first.

## Security and data lifecycle

- Encrypt transport; encrypt storage volumes and token envelopes with key IDs and documented rotation. Storage encryption at rest is not end-to-end encryption.
- Authorize before issuing object URLs; expiry initially five minutes, content disposition safe, no public bucket/listing. Cross-workspace and soft-deleted evidence return no file grant.
- PostgreSQL row-level security is defense in depth, with transaction-scoped workspace context reset safely under connection pooling; application scope checks remain mandatory. Worker uses scoped contexts, not an unrestricted ordinary query helper.
- OAuth tokens live only server-side, encrypted separately from normal domain columns. Redact secrets and sensitive URL params. No tokens in job payloads.
- CSRF, secure SameSite cookies, OAuth state/nonce/PKCE as supported by selected flow, redirect allowlist, CSP, upload size/content controls, webhook signature validation, and rate limits are owned by A09 with A01/A03.
- Retention baseline: originals retained until user deletes or selects expiry; chat retention configurable; temporary failed uploads cleaned after 24h; recoverable deletion grace seven days; private export assets expire after 24h. These are selected product defaults, configurable and disclosed. A09/A10 validate operational retention before launch.
- Deletion first revokes processing/access, then removes database/derived indexes/object assets per policy. Shared-within-workspace links get impact handling. Backups age out within a declared period (target 30 days); restore applies deletion tombstones before serving users. Do not claim immediate deletion from immutable backups.
- Self-host operators choose region and backup storage. Public launch must document processors and connected-mail usage restrictions, including whether the selected hosted AI service's data terms are compatible with mailbox data.

## Environments and delivery

Development uses local storage/database and synthetic mail fixtures; optional test provider accounts explicitly configured. Preview uses isolated data and callback URLs, disables outbound delivery by default, and cannot reach production credentials. Staging exercises real-provider test accounts. Production has separate secrets, storage, callbacks, queue limits, and monitoring.

A10 creates non-root containers, readiness/liveness probes, signed release artifacts where supported, migrations as a separate controlled job, and deployment/rollback runbooks. Rolling deployments keep message/schema compatibility. Record the deployed Git SHA, schema version, model ID, flags, and worker version.

Backups: automated DB snapshots and object version/backup strategy; restore rehearsal into an isolated environment; verify evidence hashes, reference integrity, pending jobs, deletion tombstones, and no accidental notification sends. A restore is not considered tested merely because a snapshot exists.

## Observability and service budgets

Propagate request/job correlation IDs. Metrics: queue age, attempts/failure by type, sync lag, watch expiry, extraction duration/invalid output rate, comparison review outcomes, deadline scheduling delay, delivery failure, storage utilization, API latency, auth denials. Logs use IDs/states/counts and sanitized error categories. No raw email, chat text, evidence excerpts, money, recipient addresses, or tokens by default.

Provider outage behavior: read existing records normally; show jobs queued/delayed; do not fabricate updated comparisons or monitoring success. Worker heartbeat/last-success freshness controls “monitoring active” labels. Admission control and per-workspace budgets prevent large imports from starving deadline jobs; schedule reminders at a higher service priority than bulk backfill.
