# Decisions and validation queue

Date: 2026-10-31. “Selected” is a planning choice, not proof of deployment.

| ID | Decision | State | Owner/task | Validation/evidence needed |
| --- | --- | --- | --- | --- |
| D01 | Responsive web platform with ten bounded work areas | Selected | Maintainer | PRODUCT.md and user request |
| D02 | TypeScript/Next.js, Node worker, PostgreSQL, S3 | Selected | A01-T01 | Exact versions, compatibility, clean build and disposable DB |
| D03 | Hosted Gemma 4 26B A4B baseline, explicit local alternative | Selected; live validation pending | A04-T01 | Account capability probe, multimodal/JSON tests, latency/cost, terms |
| D04 | Auth.js OIDC with DB sessions | Selected; compatibility pending | A09-T01 | Current release support and provider test login |
| D05 | Read-only delegated Gmail/Microsoft integrations | Selected; access readiness pending | A03-T04/T05 + A09-T04 | Provider configuration, callback/webhook validation, scope/policy readiness |
| D06 | Private/self-hostable; no automatic claim of on-device processing | Selected | A09-T04 | UI provider labels and network/consent tests |
| D07 | PostgreSQL durable jobs/outbox, no initial Redis service | Selected | A01-T04 | Lease/retry/replay/priority tests |
| D08 | Single live TASKS.md on coordination Git ref | Implemented tooling; remote initialization separate | Maintainer | Local bare-remote concurrency tests; live init when pushed |
| D09 | Draft/copy/export actions, no server complaint sending | Selected | A08-T05 | UI/actions do not falsely report sent |
| D10 | India initial locale; explicit calendars/timezones/currencies | Selected | A04-T03 + A06-T02 | Hindi OCR/date fixtures and business-day calendar licensing/versioning |
| D11 | Hosting provider, region, monthly cost ceiling | Open | A10-T04 with project owner | Measured workload and approved deployment profile; no purchase assumed |
| D12 | Fonts, logos and dependency licenses | Open | A02-T01 + A10-T06 | Licensed local font + Hindi fallback; attribution inventory |
| D13 | Data retention defaults and backup deletion window | Selected defaults; operations pending | A09-T05 + A10-T04 | Seven-day grace, 24h export/temp cleanup, declared backup window/restore tombstones |
| D14 | Hosted model processing of connected-mail data | Release gate | A09-T04 + A03-T07 | Review provider data-use terms and Google/Microsoft requirements against actual deployment |
| D15 | Public trust pages and jurisdictional guidance | Release gate | A09-T07 + A10-T06 | Pages reflect actual deployment; current official contact/escalation links |
| D16 | Notification channel/provider and domain setup | Open | A08-T03 + A10-T04 | Delivery adapter, opt-in test, credentials supplied privately, sender auth |
| D17 | Repository MIT license; dependencies separate | Selected | Maintainer/A10-T06 | LICENSE; model/dependency notices tracked |

## How to change a decision

Create a request file, record its ID on the board, identify impacted owners, and describe migration/compatibility/testing. An accepted request updates the relevant decision and source contract in the same PR or a coordinated sequence. Never create two competing sources of product truth. Product scope changes update PRODUCT.md first, then tasks/contracts/fixtures. Completed tasks retain their historical meaning; additional scope gets new IDs through a reviewed board schema/catalog change.
