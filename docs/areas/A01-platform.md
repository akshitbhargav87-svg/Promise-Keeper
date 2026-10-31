# A01 — Platform and shared runtime

Owns root package/runtime config, `apps/web/src/server/`, `apps/worker/src/`, `packages/contracts/`, `packages/db/`, `packages/runtime/`. A02 owns root visual layout; A10 owns CI/infra. Shared contract edits need the affected domain owner's review.

Start now with the blueprint. Final integration needs A09 access context and domain migration/job contributions. Output is infrastructure usable by all nine other areas, not a second product UI.

### A01-T01 — Establish a reproducible monorepo

Create pinned Node/package-manager versions, root workspace configuration/lockfile, Next.js web skeleton, Node worker skeleton, TypeScript strict config, formatter/linter/build scripts, and a tested local environment guide. Provide typed environment validation and separate development/preview/production profiles. Agree one form/query/date library with A02/domain owners and record exact versions.

Acceptance: fresh checkout installs from the lockfile and builds web/worker; missing configuration fails with sanitized actionable errors; no real credentials required for synthetic development; supported Windows and container command paths documented. Do not overwrite planning CI/tools.

### A01-T02 — Publish runtime contracts and fixtures

Translate docs/CONTRACTS.md to shared runtime validators/types and complete OpenAPI 3.1 request/response schemas. Preserve the concrete extraction schema. Implement Money, deadline, pagination, error, principal/job context, event envelope, version/idempotency primitives. Publish stable feature registration interfaces so no feature edits a giant shared registry.

Acceptance: all ten owners can import the public interfaces without circular imports; synthetic contract examples validate; unauthorized/conflict/uncertain fixtures are included; generated types/API examples agree; source refs and nullable values retain defined semantics.

### A01-T03 — Build database and migration foundations

Create DB client/transaction interfaces, tenant-key conventions, migration runner and contribution workflow. Add global entities with A09 input; consolidate domain schema proposals with ordered migrations. Implement scoped repository helper, unique/FK constraints, version updates, and test DB lifecycle. RLS policy scaffolding receives A09 review.

Acceptance: disposable DB migrates from zero; duplicate IDs and cross-tenant references fail; failed transaction rolls back domain writes/outbox together; pooled connection context cannot leak workspace; migration rollback/repair approach documented.

### A01-T04 — Implement durable jobs and outbox

Implement leases, SKIP LOCKED or selected equivalent, retries/backoff, dead letters, cancellation, job priority/admission budgets, transactional outbox, consumer dedup, and worker registration. Provide injectable clock, shutdown behavior, heartbeat and queue health ports.

Acceptance: two workers cannot commit conflicting job results; crash after external response replays safely; expired lease is recoverable; poison job terminates visibly; reminder priority survives bulk imports; no process-local scheduler is required for durability.

### A01-T05 — Implement private storage and async transport

Provide S3 port/local adapter, scoped upload/download grants, integrity finalization, object lifecycle hooks, job-status endpoints, correlation IDs, and SSE infrastructure. A03 owns scanning/parsing orchestration; A09 reviews authorization. Support streaming without leaking secrets through URLs/logs.

Acceptance: unauthorized evidence never receives a grant; truncated/oversized/mismatched file fails finalization; expired grants fail; job status is tenant-scoped; SSE reconnection can load durable state; private data is absent from diagnostics.

### A01-T06 — Wire feature modules and operational defaults

Integrate domain route/job/schema manifests via typed composition, shared error mapping, quota configuration, readiness/liveness, and dependency injection. Add deterministic fixture mode and reject accidental mocks in production. Support A10 container/deployment wiring without choosing paid resources unilaterally.

Acceptance: every module registers without editing another feature's internals; unknown contract/job versions fail safely; disabled providers return honest states; web/worker shutdown and health checks work; no outbound production delivery in test mode.

### A01-T07 — Verify platform integration and publish handoff

Run actual database/storage/worker plus A09 principal context and the domain contribution integration suite. Exercise upload-to-job, transactional domain write/outbox, scoped reads, worker retry, version conflict and migration sequencing. Publish public runtime entry points, example vertical slice, and operational limits.

Acceptance: A03–A08 can replace mocks with runtime ports; fresh-install and crash/replay checks pass; migrations and access tests reviewed; no fake auth or storage in acceptance evidence; PR merged and references posted on the live board.
