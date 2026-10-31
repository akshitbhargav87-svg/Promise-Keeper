# A08 — Reminders, notifications, cases and evidence packs

Owns `packages/actions/`, actions/notifications/calendar features and S18/S19/S20. A09 owns privacy lifecycle and consent; A03 owns original evidence; A05/A06 provide domain targets/events.

Start with exact/estimated/unknown date fixtures and comparison facts. Final integration needs A01 worker/outbox, A03 storage, A05/A06 events and A09 opt-in policy.

### A08-T01 — Define reminder and case contracts

Implement reminder rules/occurrences/channel states, quiet-hours policy, deadline projection, case stages/draft versions/outcome facts and evidence-pack manifests. Publish interfaces for home/domain/chat and contribute migrations.

Acceptance: occurrence identity deterministic; source deadline precision retained; case sent self-report distinct from export; partial outcome arithmetic explicit; in-app state separate from external delivery receipts; fixture contracts agree.

### A08-T02 — Implement durable scheduling and calendar

Build date projection and worker scheduling, snooze/rule edits, cancelled future occurrence replacement, JIT stale-target checks, S20 calendar/list and private user-triggered ICS download. Use injected clock and prioritize deadlines over backfill.

Acceptance: DST/quiet hours/near deadline/revised deadline/business calendar examples pass; unknown date never becomes exact; duplicate worker/replay doesn't duplicate intent; calendar all-day versus timed values correct; accessible list exists.

### A08-T03 — Implement notification center and delivery adapters

Build S19, unread/type/day filters, mark read/snooze/dismiss, in-app feed, opt-in immediate/digest email, optional user-triggered browser push setup, preferences and failure visibility. Development uses local delivery sink.

Acceptance: retry deduplicates occurrence/channel as far as provider supports; no exactly-once claim; quiet-hour exception requires user choice; minimal private email content; no marketing opt-in bundling; real test delivery plus unsubscribe/preferences verified.

### A08-T04 — Implement case lifecycle and evidence facts

Build S18 list/detail, create from comparison/promise/manual, facts/uncertainties/contact provenance, follow-up dates, response upload, partial/full resolution and next actions. Link the same canonical records rather than copying evidence into a new silo.

Acceptance: missing facts visible; A05/A06 changes reflected by versions; user-entered assertion labeled; case stage doesn't falsely mark underlying subscription cancelled; follow-up intent replays safely; scoped list/detail/edit/conflict flows work.

### A08-T05 — Implement grounded draft composer and review

Integrate A04 drafting, editable subject/body/tone/language, source citations/attachment selection/redaction preview, copy/download/client composer, explicit Record sent and response capture. V1 has no server complaint-send endpoint.

Acceptance: no unsupported statute/recipient/invented evidence; generated draft remains editable; opening email client does not mark sent; source deletion before export blocks or asks revision; screen clearly distinguishes drafted/sent self-report/resolved.

### A08-T06 — Implement evidence packs and outcome exports

Generate async PDF/text summary plus selected originals/redacted derivatives and hash/date/source manifest; sanitize filenames and CSV text, enforce output limits/private expiry, permit preview and authorized download, integrate deletion cancellation.

Acceptance: exported sources exactly match reviewed selection and manifest; redaction derivative correct; malicious filenames/path traversal blocked; no cross-workspace assets; screen-reader-friendly summary exists; expired/revoked export inaccessible; originals preserved.

### A08-T07 — Verify deadline-to-resolution lifecycle

Run J03/J04/J05/J07/J09/J12 with actual scheduler/storage/domain/drafting and real test alert delivery. Review crash/retry, timezone changes, partial refunds, shared source deletion and pack usability.

Acceptance: all S18–S20 states work; no mock production delivery when enabled; opt-in/retention and operator retry controls verified; merged PR, rendered pack review and handoff evidence on board.
