# A03 — Capture, evidence vault and automatic email tracking

Owns `packages/ingestion/`, capture/evidence/connections features and route families, S06/S07/S08/S16/S17. A09 owns OAuth/session/consent policy; A03 owns provider sync and evidence flow. A04 owns extraction output; A05/A06 own confirmation domain handlers.

Start with synthetic files and extraction/provider fixtures. Final integration needs A01 DB/storage/jobs, A04 extractor, A05/A06 persistence handlers, A09 consent and secrets.

### A03-T01 — Define ingestion ports and source fixtures

Implement evidence/source/candidate DTOs, scan/parser/model ports, review issues, dedup keys, source-span lineage and integration handler boundaries. Create safe sample PNG/PDF/text/EML fixtures plus malicious/oversize/corrupt examples without actual personal data.

Acceptance: fixture pipeline conforms to extraction schema; two promises per source remain distinct; same file same workspace deduplicates bytes without losing links; no cross-workspace existence leak; missing fields become review issues.

### A03-T02 — Implement capture and safe parsing pipeline

Build S07, upload grant/finalize integration, private quarantine/scanning, PDF raster/text parsing, OCR assets, safe EML conversion, job progress, manual entry, pasted text and cancellation/retry. Implement limits in PRODUCT.md and shared config.

Acceptance: keyboard/file chooser and per-file retries work; corrupted/active content never renders; original bytes immutable; parser time/page/pixel/network limits tested; navigation preserves job progress; no remote media loaded by EML.

### A03-T03 — Implement review inbox and confirmation

Build S06/S08 split source/details review, spans/highlights, field correction, dates/conditions, duplicate resolution, dismiss, retry and idempotent multi-candidate save. Confirm through category handlers; preserve source and user revisions.

Acceptance: uncertain critical fields prevent unsafe batch confirmation; conflict retains edits; double-save yields one domain result; discarded candidate doesn't silently delete evidence; source tab usable on mobile/accessibility; candidate review history is queryable.

### A03-T04 — Implement Gmail monitoring adapter

With A09's OAuth/consent port, implement selected labels/senders/backfill, read-only access, watch registration/renewal, history pagination, gap re-sync, verification and durable checkpoints. Expose state/last success/quota and per-connection generation invalidation.

Acceptance: real test account sync plus provider replay fixtures pass; duplicate/out-of-order notifications don't duplicate candidates; history gap recovers within bounded scope; revoked connection rejects queued jobs; no send/modify/delete permission or action; verification readiness documented separately from testing exception.

### A03-T05 — Implement Microsoft monitoring adapter

Implement delegated Mail.Read, folder selection, folder delta cursors, notification validation/subscription renewal, bounded recovery, token refresh coordination, and the same source adapter contract. Support configured account/tenant constraints honestly.

Acceptance: real test mailbox initial/delta sync; invalid webhook challenge/notification refused appropriately; expired cursor and deleted/moved message cases handled; no unintended Mail.Send/Mail.ReadWrite; cross-provider duplicates use workspace evidence rules, not unsafe global matching.

### A03-T06 — Complete vault and connections UI

Build S16/S17, original/text viewer, linked records, extraction history, redaction derivative preview, privacy-aware asset access, source filters, connector activity/rules/privacy, pause/resume/sync/reconnect/disconnect. Integrate default retention and deletion impact.

Acceptance: S16/S17 all states work; API grant broader than app filter is explained; delay/outage distinct from no new records; disconnected generation stops ingestion immediately; shared evidence deletion impact visible; no raw bodies/tokens in operational views.

### A03-T07 — Verify capture-to-memory and mail lifecycle

Run J01/J02/J08/J09/J12 with actual DB/storage/worker/Gemma test configuration and real consented test mailboxes. Verify policy readiness for selected hosted model before processing real user mail; provide manual import fallback documentation.

Acceptance: candidate confirmation creates canonical A05/A06 records; evidence remains accessible and scoped; replay/crash/cursor tests pass; both adapters' live versus fixture checks clearly labeled; storage/retention and permission review complete; merged PR and handoff recorded.
