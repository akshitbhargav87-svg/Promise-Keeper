# A09 — Identity, access, consent and privacy

Owns `packages/access/`, account/privacy/onboarding features, S02/S03/S22/S27, scoped Principal/policy and lifecycle orchestrators. Other areas must implement their own scoped repositories/deletion hooks through these shared ports; A09 cannot bolt isolation on at the end.

Start with test principals/session/provider stubs. Final integration needs A01 DB/storage/jobs and every domain's access/deletion/export hooks.

### A09-T01 — Establish identity and authorization contract

Validate/pin Auth.js OIDC compatibility with A01, implement principal resolution, membership/role capabilities, session store, safe redirects, auth errors and separate operator role. Publish test principals/access-denied fixtures.

Acceptance: spoofed workspace/user fields ignored; login and mailbox consent separate; production cannot use mock auth; no account enumeration; scoped grant interface consumed by every feature; current provider setup documented without committed secrets.

### A09-T02 — Implement sign-in and onboarding

Build S02/S03 with configured identity providers, verification/error/retry, resumable locale/timezone/currency setup, optional first capture/email, processing disclosure and reminder preference choices. Separate mandatory identity steps from optional mail/analytics consent.

Acceptance: real test login/session revoke works; expired/denied callbacks handled; onboarding resume safe; optional steps skippable; no dark pattern consent or false “local” label; keyboard/Hindi/mobile flows checked.

### A09-T03 — Enforce isolation across all resource types

Integrate application grants, scoped foreign keys, RLS/session context defense, object grants, worker/job/SSE/search/export access and operator checks. Add tenant-canary integration suite with A10 and safe audit events.

Acceptance: guessed URL/body/vector/tool/job/export/object IDs cannot reveal another tenant; pooled DB context resets; revoked sessions fail; operational roles cannot browse personal evidence by default; cross-tenant linking rejected by DB.

### A09-T04 — Implement provider consent and secret lifecycle

Implement OAuth state/nonce/PKCE, encrypted token refs, refresh serialization/revocation/generation, processing-provider consent versions, change previews and connection policy checks with A03/A04. Review Google/Microsoft and hosted AI data-use compatibility for actual intended use.

Acceptance: delayed jobs fail after consent revoke; token/key rotation and sanitization tested; Gmail read scope limitations accurately explained; no silent hosted fallback; public verification/security assessment requirements recorded as done or blocked with evidence, never hand-waved as coding completion.

### A09-T05 — Implement export, retention and deletion

Orchestrate per-domain export/import, recoverable deletion grace, immediate processing/access freeze, purge handlers for originals/derived/index/chat/drafts, shared source impact and backup tombstones. Version manifests and support idempotent re-import within limits.

Acceptance: J09 and restore-with-deletion test pass; deletion doesn't leave authorized asset URLs usable beyond documented grant lifetime/revocation scheme; incomplete purge visible/retryable; backup window disclosed; import cannot inject cross-tenant references or spreadsheet formulas.

### A09-T06 — Build settings, sessions and privacy controls

Build S22 profile/appearance/reminders/processing/privacy/security/account, consent history, active sessions/revoke, data jobs and deletion preview. Add safe diagnostic export and feature-specific retention controls through ports.

Acceptance: timezone change previews reminder effects; currency preference doesn't rewrite amounts; privacy changes preserve original/source history appropriately; active mode/provider accurate; settings save conflicts/failed exports recover; sensitive data not in analytics.

### A09-T07 — Verify trust surfaces and full lifecycle

Write S27 pages matching actual deployment, complete security review with A10, exercise real sign-in/mail consent/revoke/export/delete and cross-tenant tests for every area. Check CSP/CSRF/cookies/rate-limit/upload/webhook controls with implementation owners.

Acceptance: all privacy claims demonstrably true; no production mock auth; trust/legal/provider readiness outstanding items block public launch explicitly; isolation and lifecycle regressions pass against actual services; merged PR and review evidence on board.
