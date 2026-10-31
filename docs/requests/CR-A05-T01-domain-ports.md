# CR-A05-T01-domain-ports

- State: proposed
- Requesting owner: tushar / A05-T01
- Receiving areas: A01 contracts/database, A03 candidate confirmation, A04 normalization/comparison, A06 commerce, A08 actions, A09 access
- Implementation path: packages/promises/domain.ts and ports.ts on codex/a05-tushar-domain
- Shared contract: docs/CONTRACTS.md v1, unchanged wire primitives and promise.changed.v1 envelope.
- A01 request: adopt primitive imports from shared contracts when available; supply scoped transactional repository/CAS/outbox and request idempotency. Schema contribution is packages/promises/schema/README.md; no migration numbers assigned here.
- A03 request: inject reviewed category handlers into the existing candidate transaction; resolve evidence/span/version in the authenticated workspace before invoking the kernel.
- A04 request: retain raw date semantics; supply normalized due instant only after a reviewed exact rule; stale promise versions require re-comparison.
- A06/A08 request: link canonical promise IDs and versions and consume sanitized promise.changed.v1; do not copy promise state into another silo.
- A09 request: authorize promises.read/promises.write/brands.merge from server Principal; repository and evidence resolver must enforce workspace scope.
- Fixtures and verification: packages/promises/domain.test.ts; synthetic input only. Production adapters, HTTP/UI, full schema runtime validation and real DB integration are not implemented in T01.
- Acceptance/review: pending independent review. No receiving-owner acknowledgement is claimed.
