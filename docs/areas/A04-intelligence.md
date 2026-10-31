# A04 — Gemma interpretation, comparison and evaluations

Owns `packages/intelligence/`, model adapters, prompts/schema revisions, date/amount interpretation, matching/comparison jobs, and `evals/`. A05 owns user comparison decisions; shared date/money types live in contracts.

Start with synthetic evidence/OCR and deterministic mocks. Final integration needs A01 worker, A03 immutable evidence/spans, A05/A06 domain versions, and A09 processing consent.

### A04-T01 — Verify providers and build adapter capability matrix

Implement the Gemma adapter port and capability probe for configured hosted Gemma 4, plus an explicitly selected self-hosted adapter interface. Verify actual model ID/access, text/image support, structured output behavior, timeout/cancellation, rate-limit handling, token/cost reporting and input caps. Record model/prompt/schema version metadata.

Acceptance: reproducible smoke tests with actual allowed credentials or a clearly recorded block; API keys stay server-side; local mode cannot silently call hosted; unavailable capability yields explicit fallback/review requirement; measured budgets inform A10.

### A04-T02 — Implement evidence-cited extraction

Parse image/text/PDF-derived inputs into strict candidates with brand/type/title, source spans, money/date/conditions, language and review issues. Validate against the JSON schema, ensure source references belong to inputs, and add bounded JSON repair/failure behavior.

Acceptance: every asserted critical field has a valid citation or explicit user-origin/unknown state; malformed/hallucinated IDs rejected; mixed English/Hindi examples processed; document instructions cannot override extraction or run tools; unsupported format never becomes a guessed promise.

### A04-T03 — Implement deterministic normalization and deadline rules

Build money normalization with exponents and safe integer arithmetic; date interpretation preserving raw wording/anchors/timezones/calendars; explicit ambiguity and business-day start/holiday rules. Pin a documented business-calendar source/version or request user confirmation when unavailable.

Acceptance: Friday near midnight, DST, leap year, month end, negative refund, unknown tax, missing anchor, and working-day inclusion cases pass; no invented exact deadline; precision propagates to reminder eligibility; arithmetic never depends on model calculation.

### A04-T04 — Implement matching and cross-document comparison

Candidate matching uses scoped brand aliases, order/account, period, plan, currency and type. Produce side-by-side normalized observations, deterministic delta, cited interpretation, missing-info issues and alternative matches. Conditions/tax/proration/seat/interval differences are explicit.

Acceptance: comparable INR199→349 fixture yields INR150 possible delta; differing tax/period/currency yields review/insufficient evidence; similar brand name alone cannot match; outdated promise version is re-evaluated; no automatic legal/fraud conclusion.

### A04-T05 — Implement grounded drafting and retrieval support

Provide source-grounded answer/draft primitives to A07/A08, with citation validation, language/tone controls, bounded context and no hidden reasoning retention. Expose read-only semantic indexing adapter if lexical baseline evaluation justifies it.

Acceptance: missing sources produce explicit gaps; fabricated support recipient/statute blocked; retrieved records scoped before ranking; deletion invalidates derived indexes; proposed actions remain outside model execution; facts and user allegations distinguishable.

### A04-T06 — Build and run meaningful evaluation suite

Create labeled fixtures with independent ground truth for screenshot/text/EML/PDF/Hindi, money/dates/conditions, no-promise examples, prompt injection, ambiguous matches and mismatches. Separate tuning set from held-out set; report model/prompt/schema/version and error classes.

Acceptance targets: 100% schema validity after validation/rejection, 100% displayed critical claims linked to valid supplied spans or labeled unknown, ≥95% amount/currency accuracy and ≥90% explicit date accuracy on held-out supported examples; no wrong hard deadline for ambiguous examples; all arithmetic and isolation tests pass. Report dataset size and uncertainty; do not equate small-fixture rates with general accuracy.

### A04-T07 — Integrate real evidence and publish model report

Run actual worker extraction/comparison on sanitized files via A03 and reviewed A05/A06 records; verify outage/retry/cancellation and correction feedback. Publish capability matrix, measured latency/cost, unsupported inputs, evaluation results and rollback/prompt-version strategy.

Acceptance: J01/J03/J05/J07 reasoning portions pass; production adapters use real validated schemas/source refs; A07/A08 consume stable ports; hosted-mail policy readiness checked with A09; merged PR and review evidence on board.
