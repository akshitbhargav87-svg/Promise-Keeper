# Shared contract baseline v1

This is the frozen boundary for parallel work. [contracts/extraction.schema.json](../contracts/extraction.schema.json) is a concrete interchange schema; [fixtures/scenario.json](../fixtures/scenario.json) is a deterministic synthetic scenario. A01 translates the whole baseline into runtime validators and generated TypeScript types in A01-T02. Do not invent incompatible local types while waiting.

## Shared primitives

```ts
type ID = string; // UUID supplied by server; fixture IDs are readable aliases only.
type Money = { minor: string; currency: string }; // integer string, ISO 4217 code
type Principal = { userId: ID; workspaceId: ID; roles: string[]; sessionId: ID };
type DatePrecision = 'exact' | 'estimated' | 'unknown';
type SourceRef = { evidenceId: ID; assetVersion: number; spanId: ID };
type Page<T> = { items: T[]; nextCursor: string | null; total?: number };
type ApiError = { error: { code: string; message: string; requestId: ID;
  retryable: boolean; fieldErrors?: Record<string, string> } };
type JobRef = { jobId: ID; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' };
```

API JSON uses camelCase; storage uses snake_case. Times are ISO-8601 UTC strings ending in Z. Calendar dates are YYYY-MM-DD with an explicit IANA timezone when needed. Nullable/unknown is distinct from zero/empty. List order is stable with `(sortKey,id)` cursors. Page size default 25, maximum 100, with opaque scoped cursors. No client-provided SQL/filter expressions.

Money supports negative observations/refunds but promise amounts have category-specific sign rules. Currency exponent comes from the pinned currency table, never assumed to be 2 for every code. JSON `minor` is an integer string; arithmetic uses bigint or a decimal library through shared helpers. Date calculations use an injectable Clock and tested timezone-aware library.

## HTTP convention

Base `/api/v1`; authenticated session; workspace resolved server-side. Default 200/201 for synchronous success, 202 for durable async acceptance, 204 for completed deletion/unlink. Create/action requests accept `Idempotency-Key`; a key is scoped to principal+route+payload hash, reused with a different payload returns conflict. Mutable writes carry `If-Match: <version>`; conflicts return 409 with safe current-version metadata. Client refetches and offers a diff.

Errors: 400 invalid input, 401 unauthenticated, 403 capability denied, 404 absent or inaccessible resource to avoid existence leaks, 409 version/idempotency conflict, 413 size limit, 415 unsupported format, 422 domain rule/uncertainty, 429 quota, 503 provider/worker unavailable. Provider outages do not become empty successful lists. Request IDs expose no secrets. Feature-disabled responses explain availability with a stable error code.

## Domain service ports

All functions take a server-generated Principal/JobContext, validated input, and ports (clock, repository, storage, model, outbox). Shared domain services expose interfaces without importing UI components. Adapters implement those ports; mocks use the same schema and error behavior.

| Port | Owner | Inputs → outputs / invariant |
| --- | --- | --- |
| `Access.authorize` | A09 | Principal, capability, resource → scoped grant or denial |
| `Evidence.requestUpload/finalize/getSpan` | A03 | Metadata/hash/finalization → grant/evidence/job; spans must belong to source version |
| `Intelligence.extract` | A04 | Scoped evidence IDs + locale → strict candidates + issues + model metadata |
| `Candidate.confirm` | A03 orchestration | Candidate/version + reviewed overrides → linked domain IDs atomically |
| `Brands.resolve/create/merge` | A05 | Reviewed identity/aliases → scoped brand and redirects |
| `Promises.create/update/resolve` | A05 | Reviewed terms/source refs → versioned promise/timeline/outbox |
| `Intelligence.compare` | A04 | Promise version + observation sources → cited interpretation + normalized comparison |
| `Commerce.subscription/offer` | A06 | Reviewed schedule/terms/source refs → domain record/events |
| `Search.query` | A07 | Scoped query/types/cursor → typed results/citations |
| `Assistant.respond/propose` | A07 | Thread/version/message/context → streamed answer + proposal IDs |
| `Actions.confirmProposal` | A07 dispatcher to domain owner | Proposal/version/principal → domain result; no arbitrary tools |
| `Reminder.schedule/snooze` | A08 | Domain target/date rule/user prefs → occurrence intents |
| `Cases.create/draft/export` | A08 | Confirmed facts/source refs → editable case/draft/export job |
| `Privacy.export/delete` | A09 orchestration | Confirmed scope/options → lifecycle job and access invalidation |

Candidate confirmation registers category handlers supplied by A05/A06; A03 does not create shadow promise tables. A03 owns user-facing review, A04 owns candidate interpretation, A05/A06 own persisted business validity. Dates/money validation belongs to shared contracts plus the relevant domain service.

## Route families and representative operations

| Family/owner | Operations | Important response |
| --- | --- | --- |
| `/me`, `/settings`, `/consents`, `/sessions` A09 | GET current context, PATCH settings, POST consent/revoke, DELETE session | Current scope/version and disclosed processing config |
| `/uploads`, `/evidence` A03 | POST upload grant; POST finalize; GET list/detail; GET authorized asset grant; POST links; DELETE link/evidence | Evidence/version or JobRef; no permanent public URL |
| `/candidates` A03 | GET list/detail; POST confirm/dismiss/link-duplicate/retry | Domain IDs plus candidate disposition/version |
| `/connections` A03/A09 | POST authorization start; GET callback; PATCH rules/pause; POST sync/reconnect; DELETE disconnect | Sanitized connection state, last success, consent, JobRef |
| `/brands` A05 | GET list/detail; POST create; PATCH metadata; POST merge preview/confirm | Aggregates grouped by currency, aliases and version |
| `/promises` A05 | GET list/detail; POST create; PATCH terms; POST resolve/archive/reopen; GET timeline | Canonical record, evidence refs, lifecycle and attention separately |
| `/comparisons` A04/A05 | POST compare; GET detail; POST confirm/dismiss | Cited values, deterministic delta or missing-info issues |
| `/subscriptions`, `/offers`, `/reports` A06 | CRUD plus schedule revisions/redemption/cancellation record/forecast | Money by currency, confidence and source-backed/predicted labels |
| `/search` A07 | GET typed query with scoped cursors | Result type/id/title/snippet/source refs; lexical baseline |
| `/conversations`, `/proposals` A07 | CRUD thread; POST message; GET stream; POST confirm/cancel proposal | SSE events, revision-bound proposals, cited records |
| `/cases`, `/drafts`, `/exports` A08 | CRUD case; generate/edit draft; POST evidence-pack; record sent/response/resolution | Versioned editable draft; private async export |
| `/reminders`, `/notifications`, `/calendar` A08 | CRUD rules; snooze; mark read; list events; ICS export | Occurrence and delivery state separate from target status |
| `/privacy/exports`, `/privacy/deletions` A09 | POST preview/confirm; GET job | Scoped manifest, grace/purge state, processing revocation |
| `/jobs/:id` A01 | GET status/cancel if supported | Sanitized progress, error category, retryability |
| `/webhooks/:provider` A03/A08 | POST provider notifications | Verify before acknowledgement; durable intake; no user session required |
| `/health/live`, `/health/ready` A01 | GET infrastructure health | Minimal no-sensitive output |
| `/ops/*` A10 | GET operational aggregates; POST audited job retry | Independent operator authorization |

A01-T02 publishes OpenAPI 3.1 with exact request/response shapes and enums for every family before integration. An additive field can be proposed without stopping mock work; removed/renamed fields require a versioned migration/consumer review. This baseline is precise enough to begin interfaces but must not be mislabeled as a complete generated API implementation.

## Events and background jobs

```ts
type DomainEvent<T> = {
  eventId: ID; eventType: string; schemaVersion: 1;
  workspaceId: ID; aggregateId: ID; aggregateVersion: number;
  occurredAt: string; recordedAt: string; correlationId: ID; payload: T;
};
```

Event records are committed through the transactional outbox. Consumers deduplicate by `(consumer,eventId)` and tolerate replay/out-of-order versions. No raw email body, OAuth token, or complete document in event payloads; use scoped refs. Every event's workspace matches all referenced rows.

| Event | Producer | Consumers |
| --- | --- | --- |
| `evidence.ready.v1` | A03 | A04 extraction |
| `candidate.extracted.v1` | A04 | A03 review queue |
| `candidate.confirmed.v1` | A03/domain handlers | A05/A06 timeline, A08 reminder planning |
| `promise.changed.v1` | A05 | A04 matching/comparison, A08 scheduling, A07 search index |
| `comparison.ready.v1` | A04 | A05 review, A08 in-app notification |
| `subscription.changed.v1`, `offer.changed.v1` | A06 | A08 reminders, A07 index |
| `connection.state_changed.v1` | A03 | A08 health alert, A09 consent lifecycle |
| `reminder.due.v1` | A08 | Delivery outbox |
| `case.changed.v1` | A08 | Timeline/search/notifications |
| `privacy.deletion_scheduled.v1` | A09 | All domain purge handlers; A03 connection invalidation |

Job envelope: job ID/type/schema version/workspace/resource refs/connection generation if relevant/attempt/lease/next run/idempotency key/correlation ID. Worker registry rejects unknown job types/versions. Metadata updates are transactional. Priority: deadlines/access revocation first, ordinary interactive extraction next, large backfills/exports last. A09 publishes a deletion-handler registration contract so each domain erases its derived data.

## Assistant stream and action contract

SSE events: `message.started`, `retrieval.completed` (counts/IDs only), `text.delta`, `citation`, `proposal`, `message.completed`, `error`. Event IDs support bounded resume; streamed tokens never themselves commit a write. A disconnected client can reconnect to persisted message/job state. Stop marks run cancelled and invalidates unconfirmed proposals.

Proposal fields: ID, tool enum, validated input, principal/workspace binding, source refs, target expected versions, human-readable change preview, expiry, status pending/confirmed/cancelled/expired. Confirmation rechecks all fields through domain API and stores one idempotent result. Exact allowed tools: create reviewed promise from candidate, create/update reminder, create draft case, update user-reviewed record fields. Unsupported actions return explanation. No send/cancel/purchase tool in v1.

## Contract fixtures and development

Use fixture record IDs only in synthetic/demo contexts. Real adapters generate UUIDs. Tests freeze time at `2026-10-31T05:00:00Z` (10:30 Asia/Kolkata). Scenario: a tax-inclusive INR 199 monthly price lock, a comparable INR 349 bill, and a deterministic INR 150 possible difference; a separate trial, business-day refund, and capped offer exercise different semantics. Do not use the price example when billing periods or tax contexts differ.

Every module provides success, empty, insufficient-evidence, conflict, quota/provider-down, and unauthorized fixtures relevant to its port. Mocks are wired through environment-specific composition; production startup rejects mock auth/mail/model/delivery adapters unless explicitly configured as a labeled demo deployment.
