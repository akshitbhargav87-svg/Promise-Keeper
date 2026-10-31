# A05 — Brands, promises and evidence timelines

Owns `packages/promises/`, promise/brand features, S09–S12, canonical promise/brand APIs and user comparison decisions. A04 supplies comparison interpretation; A03 supplies source/candidate UI.

Start with contract candidates and fixture repositories. Final integration needs A01 persistence/access wiring, A09 policy, A03 evidence and A04 comparisons.

### A05-T01 — Implement domain rules and repository ports

Define brand identity/aliases/merges, promise lifecycle versus attention, term revisions, source links, timeline events and comparison decision invariants. Contribute schema proposals and category confirmation handlers; expose typed summary ports for A02/A07/A08.

Acceptance: contract examples exercise active/fulfilled/cancelled/archived plus independent overdue/mismatch; domain cannot link cross-workspace records; version/idempotency rules documented; event payloads agree with consumers.

### A05-T02 — Implement brand registry and identity review

Build S11/S12 and brand CRUD, aliases, similar-brand suggestions, support provenance and merge preview/confirm/history. Use initials until licensed branding is configured. Provide brand-scoped summaries and canonical redirects after merge.

Acceptance: similar names remain distinct unless reviewed; merge preview counts all affected records; source provenance preserved; relationship reassignment restoration is possible; currency groups not summed; brand contact info never invented.

### A05-T03 — Implement canonical promises and explorer

Build S09 list/board/filter/sort/pagination/saved views and create/edit APIs, candidate confirmation, source linking, lifecycle transitions, tags and archive. Add optimistic version conflicts and safe bulk actions.

Acceptance: double confirmation yields one record; attention computed from confirmed rules; saved filters/back position stable; no model output auto-confirms mismatch; manual-origin/no-source promises visibly labeled; tenant and concurrency checks pass.

### A05-T04 — Implement promise detail and timeline

Build S10 Overview/Evidence/Timeline/Comparisons/Actions, source citations, linked commerce records, deadline/reminder summary, edit history and added observations. Distinguish source date, capture date and detection date.

Acceptance: one source reused across surfaces with canonical links; deleted source shows marker; user edits don't modify original promise/evidence history; mobile viewer navigation works; partial outcomes and reopened records retain audit trail.

### A05-T05 — Implement comparison review and resolution

Consume A04 results, render comparable contexts/delta/missing info, confirm/dismiss with reasons, attach more evidence, and create A08 case intent. Implement fulfilment/cancellation/partial-resolution with evidence/self-report labels and current-version checks.

Acceptance: tax/interval uncertainty displayed before action; dismissed result retained in history; later refund updates outstanding balance without erasing original finding; stale comparison rechecks promise revision; user decisions emit correct events.

### A05-T06 — Complete summaries, exports and shared consumers

Publish home/brand/assistant summaries and search index events, filtered promise exports, retention impact handlers, and accessible empty/error/permission states. Integrate A06 relationships and A08 next action/case counts through ports.

Acceptance: no separate shadow data for dashboards; confirmed/potential outcomes separated; CSV safe against formula injection; source deletion/search updates replay correctly; all S09–S12 states satisfy product rules.

### A05-T07 — Verify capture-to-resolution with real services

Run J01/J03/J05/J09/J10/J11 against real persistence/evidence/comparison/reminder adapters. Review brand merge, shared evidence deletion, concurrent edits, replays, mobile and keyboard flows.

Acceptance: canonical domain IDs and histories agree across home/chat/brand/case; no mock production repository; merged PR with contract/migration review and integration evidence; publish domain API handoff on board.
