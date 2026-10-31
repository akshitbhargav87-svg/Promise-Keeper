# A05 schema contribution — proposal, not an applied migration

A01 owns global sequencing and generation. Proposed tables:

| Table | Required constraints |
| --- | --- |
| brands | Composite unique (workspace_id,id), name, optional domain, positive version |
| brand_aliases | (workspace_id,brand_id) scoped FK, normalized alias, source span/provenance, reviewed flag; alias collision is a suggestion, not automatic uniqueness across brands |
| brand_merge_events | Scoped source/target FK, expected versions, reassigned resource manifest, actor/reason/time; old brand ID redirects with restoration history |
| promises | Scoped brand FK, title/kind/lifecycle, positive version, reviewed, manual-origin note; no stored computed attention |
| promise_term_revisions | Scoped promise FK, unique (workspace_id,promise_id,version), immutable source wording, money bigint/currency, full deadline inputs, conditions, actor/reason/time |
| promise_evidence_links | Scoped promise and evidence/span/version FKs; link history separate from immutable original bytes |
| promise_timeline | Scoped target FK, source occurrence versus recorded dates, actor/change/reason and source refs |
| comparison_decisions | Scoped comparison/promise-version, actor/reason/time, append-only decision history |

Creation/term change/lifecycle change must atomically CAS the aggregate, append revisions/timeline and write `promise.changed.v1` to A01 outbox. Request idempotency is principal+route+payload-digest scoped, returning the original result; same key/different payload conflicts. Candidate confirmation shares A03's transaction and does not commit a nested transaction independently. All money/currency/deadline JSON boundary validation uses A01 runtime contracts when available.

Production FK target names and SQL will be consolidated with A01 once shared evidence/resource and access schema ports land. This proposal creates no conflicting migration sequence or fake database integration.
