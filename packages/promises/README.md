# A05 domain kernel — T01

Pure TypeScript domain rules and integration ports for brands/promises. No dependency installation, runtime configuration or shared A01/A09 files are required.

Run: `node --experimental-strip-types --test packages/promises/domain.test.ts` (tested with Node 22.17).

`domain.ts` defines scoped identity suggestions, evidence-linked capture, append-only term revisions, optimistic-version lifecycle changes, independent attention flags and reviewed comparison decisions. Identity suggestions never merge brands. Dates are normalized by A04; due flags require a reviewed exact deadline. Amounts retain integer minor-unit strings/currency; currency table validation belongs to the shared A01 contract.

`ports.ts` specifies server-principal authorization, scoped evidence resolution, transactional persistence/CAS/outbox and request idempotency. A03 confirms candidates using an injected category handler and the same transaction. The module does not claim to implement PostgreSQL, HTTP routes, full runtime schema validation or production authentication. Those adapters and the screens follow after review and the corresponding area milestones.

`confirmation.ts` implements that handler with authorization before evidence reads and an injected transaction-owned idempotency operation. Trial/cashback promise creation does not create subscription/offer shadow records; A03/A06 orchestrate additional commerce records. Offer/subscription candidates are rejected by this handler and belong to A06.

Production service wiring MUST authorize first, resolve source references via EvidencePort, load scoped brand/promise rows, invoke the kernel, and persist the returned aggregate/timeline/outbox atomically through PromiseRepository. Returned source workspace IDs come from the authorized evidence repository, never the client/model. Repositories must enforce workspace-qualified keys, idempotency conflicts and CAS at the database level. No production in-memory adapter is supplied.

Public primitive structures mirror docs/CONTRACTS.md pending A01-T02 shared exports; replace with imports in the A01-reviewed integration change. No alternative wire contract or new dependency is introduced.
