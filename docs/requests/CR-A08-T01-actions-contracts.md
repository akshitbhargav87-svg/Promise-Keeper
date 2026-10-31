# CR-A08-T01-actions-contracts

- State: proposed
- Requesting owner / area / task: kunal / A08 / A08-T01
- Receiving owner / area: A01 (platform), A02 (experience), A07 (assistant)
- Branch / PR: codex/a08-kunal-actions
- Affected contract and version: Reminder, Case, Outcome, Evidence Pack Manifest, and Action Ports v1
- Why the current boundary is insufficient:
  Downstream domains (A05/A06 for cases, A02 for home summaries, A07 for chat tool proposals) require concrete TypeScript interfaces, deterministic occurrence IDs, explicit partial outcome arithmetic, and SQL migration schemas.
- Exact proposed shape/behavior:
  1. `ReminderRule` and `ReminderOccurrence` with deterministic occurrence ID: `occ_${sha256(workspaceId:ruleId:scheduledUtc:channel)}`.
  2. In-app interaction state (`unread`, `read`, `dismissed`, `snoozed`) strictly decoupled from transport delivery receipts (`pending`, `delivered`, `failed`).
  3. `CaseRecord` and `SentSelfReport`: case sent self-report requires explicit user action and is never triggered automatically by exporting PDF or opening an email composer.
  4. Explicit `calculateOutcomeArithmetic` validating `disputedMinor - recoveredMinor = remainingMinor`.
  5. `EvidencePackManifest` with SHA-256 integrity hash, path-sanitized filenames, and accessible plain-text summary.
  6. Service ports `HomeAttentionActionsSummary` for A02 and `AssistantActionToolProposal` for A07.
  7. Migration DDL `A08_SQL_MIGRATIONS` for PostgreSQL multi-tenant tables.
- Compatibility and migration:
  Adds non-breaking contracts in `packages/actions/` matching baseline schema conventions.
- Owned/shared files touched:
  - `packages/actions/*`
- Fixture/example:
  Conforms to `fixtures/scenario.json` price_lock breach (INR 199 promised vs INR 349 observed = INR 150 disputed).
- Acceptance checks:
  All 7 unit tests in `packages/actions/tests/test_a08_contracts.mjs` pass.
- Blocking impact and safe work that can continue:
  Non-blocking. Unlocks A08-T02 (durable scheduling) and provides the required action proposal contracts for A07.
- Decision, real reviewers, date:
  Proposed for peer review.
- Implementation and validation evidence:
  `packages/actions/tests/test_a08_contracts.mjs` executed and passed on Node v24.
