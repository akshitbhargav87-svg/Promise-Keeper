# A07 — Grounded assistant, search and reviewed actions

Owns `packages/assistant/`, assistant/search features and S05/S21. A04 provides model primitives; domain owners provide authorized read/write services. Chat does not create a second source of truth.

Start with mock domain ports and cited fixture messages. Final integration needs A04 provider, A05/A06 domain APIs, A08 actions/reminders and A09 access/consent.

### A07-T01 — Define conversation, retrieval and tool contracts

Implement message/citation/context/proposal schemas, exact allowed tool enums, principal-bound execution, streaming event mapping and mock domain tools. Define prompt/input budgets and stop behavior. Contribute schema proposals.

Acceptance: tools contain no arbitrary SQL/code/HTTP/send/cancel/purchase; proposals carry target revision/expiry/source refs; read and proposed-write outputs differ; unsupported intents have usable responses; fixtures conform to shared contracts.

### A07-T02 — Implement scoped lexical search

Build S21 and search service across promises/brands/commerce/evidence/cases/conversations with stable pagination, snippets, type/date/brand/source filters, source citations and selected-result assistant context. Apply scope before retrieval/ranking.

Acceptance: guessed tenant IDs/query injection return no data; deleted/redacted sources don't leak snippets; lexical baseline works without model/embeddings; empty/partial/index-delay states differentiated; private queries absent from logs by default.

### A07-T03 — Implement conversation interface and durable streaming

Build S05 thread list/new/rename/archive/delete, composer/attachments via capture, context panel, citations/domain cards, stop/retry, connection loss and rate-limit states. Persist durable message/run state without hidden reasoning.

Acceptance: interrupted stream resumes or retries clearly; typed message survives upload/provider failure; keyboard/mobile behavior correct; stop prevents subsequent tools; history deletion explains evidence retention; actual processing mode visible.

### A07-T04 — Implement grounded response orchestration

Authorized retrieval → bounded context → Gemma answer → citation validation → structured domain cards. Support weekly attention, brand overview, trials, source comparison requests and insufficient evidence. Add semantic adapter only after A04 evaluation supports benefit.

Acceptance: supported factual claims cite existing authorized spans; cannot cite unseen/deleted record; injected document instructions ignored; no provider-down fake answer; reports preserve money/date uncertainties; multilingual responses retain exact cited amounts.

### A07-T05 — Implement reviewed tool proposals

Render exact action previews and confirm/cancel; execute only through domain APIs with server principal, current version, consent, idempotency and expiration. Add reminder/draft/record update proposals defined in contracts.

Acceptance: user text does not itself send/create an irreversible action; double-confirm yields one result; target change/consent revocation invalidates proposal; expired/cancelled proposals cannot execute; record edits appear in canonical timeline and UI.

### A07-T06 — Complete limits, privacy and evaluation

Add per-workspace turn/tool/token limits, sanitized telemetry, history retention/export/delete, prompt/citation evaluation cases, and stress tests for loops/large sources/cancellation. Work with A09 deletion handlers and A10 evaluation reports.

Acceptance: no infinite tool loop; bounded response timeout; conversation/export isolation; user/source-derived recipients rejected as autonomous destinations; citation-support and injection results recorded with held-out examples.

### A07-T07 — Verify real grounded chat and domain actions

Run J07/J10/J11 with actual retrieval/Gemma/domain/reminder/draft adapters plus provider outage, stale action, deleted citation and revoked consent. Compare chat results with canonical screens for the same records.

Acceptance: no mock production tools/model/search; all write proposals revalidate server-side; mobile/keyboard and stream recovery checked; actual model and limitations documented; merged PR and verified handoff on board.
