# Task-level dependencies and staffing without deadlocks

Areas have independent starts; actual end-to-end delivery has shared prerequisites. A feature can use contract fixtures while a provider is pending, but acceptance that explicitly requires a real provider must wait. A dependency below means **the named capability is merged and testable**, not that its whole area is marked complete.

## Contract-first working agreement

1. All T01 tasks can start from the existing baseline. Domain owners publish ports/schema proposals and fixtures early.
2. A01-T02 consolidates exact runtime/API contracts with those owners. A01-T03/T04/T05 provide DB/jobs/storage incrementally.
3. A09-T01/T02 publishes real principal/session context early; A09-T04 publishes connected-mail/processing consent. Other features initially use explicitly labeled test principals.
4. Feature tasks with mock acceptance record precisely what is mocked. No final integration task accepts mocks.
5. A10 starts CI/harness work early and adds each delivered capability; testing is not postponed until all features are finished.

## Key capability prerequisites

These supplement the full task acceptance in each area file. If an integration reveals another missing capability, record it on the live board rather than silently weakening acceptance.

| Work being integrated | Implemented prerequisites |
| --- | --- |
| A01-T03 scoped DB foundation | A09-T01 principal/policy schema input; domain T01 schema proposals as each arrives |
| A01-T07 platform acceptance | A09-T01/T02 real request principal/session; at least one real domain/schema contribution; A01-T01–T06 |
| A02-T07 real home/shell | A01-T01/T06 web composition; A09-T02 sign-in; A03-T06 connection summary; A05-T06/A06-T05/A08-T03 summaries |
| A03-T02 durable capture | A01-T04/T05 worker/storage; scanner/parser adapter; can use extraction fixture until A04-T02 |
| A03-T03 persisted candidate confirmation | A05-T01/T03 and A06-T01/category handlers; fixture handlers allowed for UI-only checks, real handlers required by T07 |
| A03-T04/T05 real mail tests | A01-T04/T05; A09-T04 consent/token port; configured test mail accounts; A04-T02 for actual extraction |
| A03-T07 full ingestion acceptance | A04-T02/T03 extractor/normalization; A05-T03/A06-T03/T04 handlers; A09-T04 provider consent/policy readiness |
| A04-T07 real reasoning | A01-T04 worker; A03-T02/T03 evidence/spans; A05-T03/T05 records/comparison review; A06-T02 normalized terms; A09-T04 processing consent |
| A05-T05 real comparison/case linkage | A04-T04 comparison; A08-T01/T04 case port; A03-T03 source/candidate refs |
| A05-T07 full promise acceptance | A01-T03–T06; A03-T03/T06; A04-T04; A06-T01 domain links; A08-T02/T04; A09-T03 access integration |
| A06-T06/T07 real commerce integration | A05-T03 canonical promises; A08-T02/T03 scheduling/notification; A03-T06 sources; A09-T03/T05 privacy hooks |
| A07-T07 real assistant | A04-T05 answer adapter; A05-T06/A06-T06 domain tools; A08-T05 draft/reminder actions; A09-T03/T04 access/consent; A01 SSE/runtime |
| A08-T07 full action lifecycle | A01-T04/T05; A03-T06 originals; A04-T05 drafting; A05-T05/A06-T06 domain events; A09-T04/T05 consent/deletion hooks |
| A09-T03 isolation checks | A01 scoped DB/storage/context; typed adapters/canary tests for each resource family; repeat real coverage at T07 |
| A09-T05 export/deletion integration | Domain export/purge handlers registered by A03/A05/A06/A07/A08; A01 durable jobs/storage; A10 restore harness |
| A09-T07 final trust acceptance | Every feature's implemented ≤T06 routes/adapters; A10 security harness; actual provider/legal/processing readiness |
| A10-T07 complete release | All area acceptance and merged implementation; QUALITY.md gates; real environment/provider/restore evidence |

Final integration tasks may validate the same assembled services during one integration window. They do not require each other's T07 to be marked done first. A10's release gate follows all of them.

## Four-person rotation example

Use this as a scheduling guide, not a board reservation. Milestones are stopping points that must satisfy their own acceptance. Real reviewers rotate among other team members; do not invent task approvals.

| Person | Initial area | Rotation when waiting | Later work |
| --- | --- | --- | --- |
| 1 | A01 foundations | Publish/block/release A01 if waiting for access; claim A09 for identity/consent | Return to A01 integration, then A09 privacy/trust |
| 2 | A02 foundations/shell | Publish/release A02 before unavailable real summaries; claim A05 | Finish brands/promises; return to A02 real experience |
| 3 | A03 capture/review | If provider/domain dependencies block, publish/release and claim A06 | Commerce domain; return for real mail/ingestion acceptance |
| 4 | A04 model/contracts/reasoning | Publish/release at real-domain gate; claim A08 for reminders/cases | Return to A04 integration, then A07 assistant; A10 shared rotation |

Someone who completes a work packet can take A10 CI/harness immediately; it need not wait for person 4. The integration lead checks current blockers and moves an available owner to the highest-leverage unclaimed prerequisite. Do not let all four people hold blocked claims while A09/A05/A06/A08 remain unclaimed.

## Three-person rotation example

- Start A01, A02, A04. Publish the earliest runtime/UI/model contracts.
- Rotate the platform owner to A09 and the UI owner to A05 after a safe checkpoint; rotate the model owner to A03 once the extraction port is available.
- Use the next released/finished owner for A06, then A08; complete needed runtime/access integrations as capabilities become available.
- Build A07 against the assembled domain; rotate A10 CI/harness/ops through published checkpoints throughout, then execute the release gate.

All changes remain reviewable and merge in capability-sized PRs. A03/A04/A05 mutual integration is achieved by their earlier ports/implementation, never by demanding all three areas be complete before anyone can proceed.

## What to do at a blocked gate

Start the first unfinished task if not already started; record its exact blocker, source branch/PR, implemented capability and pending validation. Push safe progress. Use `block`, then `release` with a full handoff before claiming another area. When returning, claim the area, read intervening notes/requests, use `resume` for a blocked task, and validate against current prerequisites. Completed tasks stay completed. Do not skip a failed dependency or mark a fixture as a successful real integration.
