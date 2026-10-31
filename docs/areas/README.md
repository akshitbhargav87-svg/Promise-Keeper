# Parallel execution areas

Each area has seven tasks completed in order. Each task specifies output and acceptance; the final task verifies real integration, not just fixtures. Claim one area through the live board before implementation. Ownership here refers to code boundaries, while the board records the current person/session.

| Area | Plan | Product coverage |
| --- | --- | --- |
| A01 | [Platform and runtime](A01-platform.md) | Monorepo, schemas, DB, storage, jobs, wiring |
| A02 | [Design and shell](A02-experience.md) | S01/S04, primitives/navigation, all shared states |
| A03 | [Capture and email](A03-ingestion.md) | S06/S07/S08/S16/S17 |
| A04 | [Intelligence](A04-intelligence.md) | Extraction, dates, matching, comparisons, evaluations |
| A05 | [Brands and promises](A05-promises.md) | S09/S10/S11/S12 |
| A06 | [Subscriptions and offers](A06-commerce.md) | S13/S14/S15/S24 |
| A07 | [Assistant and search](A07-assistant.md) | S05/S21, cited retrieval, reviewed tool proposals |
| A08 | [Actions and reminders](A08-actions.md) | S18/S19/S20, notifications and evidence packs |
| A09 | [Access and privacy](A09-trust.md) | S02/S03/S22/S27, tenant/consent/lifecycle enforcement |
| A10 | [Quality and release](A10-delivery.md) | S23/S25/S26, CI, deployment, integrated release |

## Rules shared by all area tasks

- T01 starts against baseline contracts/fixtures; no area must wait idle for the entire platform.
- Mock/fixture work is valid progress, but task acceptance that calls for real integration requires actual services. T07 is blocked until prerequisites are available.
- Every UI task covers PRODUCT.md's relevant loading, empty, partial, error, permission, mobile, keyboard, and conflict states.
- Every backend task enforces workspace scope, version/idempotency requirements, privacy-safe logs, and replay behavior as applicable.
- Task output includes implementation, relevant verification, a reviewable PR, and a current board checkpoint. Tests must verify material behavior, not mirror code.
- Review each task before its next task starts. Reorder/split only through an accepted plan change; preserve task ID history.
- An area is complete when all tasks are reviewed and merged and its full integration evidence is recorded.

**Independent start does not mean dependency-free delivery.** Build adapters to the shared port, use provided fixtures, record needed contracts, and run the real integration as soon as its provider is ready.
