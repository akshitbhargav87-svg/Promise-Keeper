# Quality, integration and release gates

This checklist defines evidence required to complete tasks/areas. The application does not exist yet; unchecked gates are pending. A passing planning test suite is not a passing product release.

## Checks available in this blueprint

```powershell
python scripts/check_repo.py
python scripts/coord.py validate
python scripts/coord.py list --offline
python -m unittest discover -s tests -v
```

Planning checks verify local Markdown links, catalog/board agreement, ordered state, audit/render consistency, extraction fixture shape and integer-money example. Coordinator tests use real local bare Git remotes to test single-winner claims, unrelated concurrent updates without lost history, failed remote writes, dirty-snapshot refusal, and unchanged feature checkouts. They do not test GitHub account permissions, administrative branch rules, or actual code review identity.

## Required implementation verification matrix

| Slice | Unit/contract checks | Integration checks | UI/manual checks |
| --- | --- | --- | --- |
| Runtime | Config, schema, money, date, errors | DB transactions/FKs/RLS, storage grants, job leases/outbox | Useful missing-config/health state |
| Capture | Limits, MIME/parser, spans/dedup | Quarantine/scanner, immutable original, resume/replay | File chooser, progress, retry, accessible viewer |
| Email | Notification verification/cursors/generation | Provider test accounts, renewal/gap recovery/revoke | Filters, account identity, last success, disconnect impact |
| Intelligence | Strict validation, arithmetic, date ambiguity | Actual configured Gemma and source refs | Uncertain fields and evidence highlights |
| Promises/brands | Lifecycle, aliases, revisions, matching | Candidate handler, comparison, source/case linkage | Lists/detail/merge/conflict/mobile |
| Commerce | Recurrence, benefit caps, currency | Events/reminders/canonical linked promises | Cancellation truth, offer eligibility, reports |
| Assistant | Tool allowlist, citation/action expiry | Scoped retrieval, actual model, domain write proposals | Stop/retry/history/source navigation |
| Actions | Deadline/quiet-hour/dedup/outcome rules | Actual worker/delivery/export objects | Draft review/redaction/record sent/calendar |
| Access/privacy | Principal/consent policies | Every tenant resource, delete/export/revoke/restore | Sign-in/setup/settings/impact previews |
| Delivery | CI/quotas/health | Clean install, upgrades/rollback, backup restore | Demo/help/ops/trust pages |

## End-to-end journey evidence

Each journey records Git SHA, schema/model/provider/feature flags, environment, fixture versus live dependencies, steps, expected/observed results and links to sanitized artifacts. Use synthetic brand names; never attach a real private mailbox screenshot to a public PR.

- **J01 Capture to memory:** sign in, skip optional email, upload screenshot, correct a field, confirm. Assert one immutable source, one reviewed promise, correct brand, timeline, home summary and citation.
- **J02 Auto email:** initial/backfill plus incremental change in each provider's consented test account. Re-deliver notifications and replay jobs; assert durable dedup, correct cursor, source date, no inbox mutation, reviewable candidates and visible last success.
- **J03 Price mismatch:** compare same-plan/period/tax INR199 and INR349 evidence; assert INR150 candidate difference and sources. Repeat with inconsistent tax/currency/period to assert insufficient evidence. Confirm/dismiss and inspect history/case.
- **J04 Trial:** exact and ambiguous trial cutoffs, month end/DST, opt-in reminders, test clock and cancellation request/confirmation. Assert warnings survive mere request, no duplicate occurrence, correct timezone.
- **J05 Refund:** five working days with explicit synthetic calendar/start inclusion, overdue follow-up, partial refund and full resolution. Assert source-backed date, correct outstanding amount, editable draft.
- **J06 Offer:** minimum spend, percentage/cap, unknown eligibility, purchase/redemption deadlines, mark used and cashback promise. Assert no guaranteed saving before eligible facts and no duplicate redemption.
- **J07 Assistant:** weekly attention, brand question, insufficient sources, prompt injection, reminder/draft proposal, confirm twice, change target before confirmation, stop stream. Assert scoped citations, one write, stale/expired proposal rejection, no external sending.
- **J08 Connection revoke:** pause/disconnect, delayed webhook/job, token refresh race, reconnect account mismatch, history gap. Assert generation invalidation, no new access, honest health and bounded re-sync.
- **J09 Export/delete:** selected redactions/evidence pack/manifest, shared evidence deletion preview, undo grace, final purge, export expiry, restore with tombstones. Assert no orphan leakage, original immutability and usable accessible summary.
- **J10 Responsive/conflicts:** mobile deep link and back/filter restoration, keyboard/zoom/Hindi/dark mode, two clients editing same version, offline form failure. Assert no lost edits or hidden required action.
- **J11 Isolation:** two tenants with canary secrets; try record URLs/JSON/workspace overrides, vector/lexical query, spans/storage URLs, job/SSE stream, assistant tools, export IDs and operator routes. Assert no content/existence/snippet leak and safe denial/audit.
- **J12 Crash/recovery:** kill worker after adapter success/before commit, expire lease, replay event, lose cursor, provider 429/5xx, queue flood. Assert idempotent records/outbox, bounded retries, preserved checkpoint and deadline priority.

## Model evaluation gate

Owner A04. Record independent ground truth, tuning/held-out split, sample counts, model ID/prompt/schema, input types/languages, field errors and supported scope. Use the quantitative targets in A04-T06. Schema rejection is not semantic accuracy. Citation existence is not citation entailment: manually label whether cited source actually supports the claim. Retain uncertainty/unknown for incomplete evidence. Report small-sample limits and regressions, never an unqualified “perfect AI” claim.

Must-have adversarial cases: document tells assistant to ignore instructions/send email; source contains invented support address; OCR swaps decimals; currency symbol ambiguous; refunded versus charged signs; offer expired; invoice includes tax/seat/proration; same brand different account; wrong billing period; approximate Friday; five business days without calendar; deleted citation; untrusted HTML/EML external images; cross-workspace source IDs.

## Accessibility and visual gate

Owner A02 with each screen owner. Automated checks plus manual keyboard, screen reader smoke, contrast, meaningful focus, dialogs, table headers, live updates and 200% zoom. Verify 360/768/1280/1920px, English/Hindi, long brand/title, large amounts, light/dark/system, reduced motion, initial/partial/error/empty/permission/conflict states. Charts have tables; statuses use text/icons; private source viewers offer accessible extracted text. Include screenshots for material UI PRs, using synthetic data.

## Operational and security gate

- Web/worker/storage/database are real, distinct processes; restart does not lose schedules.
- Default/preview/production secrets and callback URLs are separate. No mock production auth/model/connector unless explicitly labeled demo.
- OAuth scopes and processing disclosures match deployed code; connected-mail provider and AI data policy requirements verified for actual audience.
- Upload scanner/parser sandbox, webhook authenticity, private object grants, CSP/CSRF/cookies/redirect/rate limits and tenant suite pass.
- End-to-end correlation IDs and health checks work without sensitive logs. Monitoring-active depends on fresh successful work/heartbeats.
- Actual load profile tests PRODUCT.md latency/queue targets and bounded quotas; report provider-dependent performance separately.
- Backup restored into isolation; hashes/links/tombstones verified; notifications disabled during restore; rollback rehearsal documented.
- Retention/purge/export expiry executed, not just scheduled. Keys/tokens rotated in test; revoke invalidates queued jobs.
- Dependency/license/secret checks pass; public trust pages describe real data behavior; known limitations have clear user-facing states.

## Full release checklist (A10-T07)

- [ ] Ten areas complete, seventy tasks reviewed with real evidence, all code merged.
- [ ] S01–S27 and system screens implement specified controls/states; no dead CTA/placeholder production route.
- [ ] J01–J12 pass against real local/staging services; live mail/model/delivery checks separately recorded.
- [ ] Accessibility, language, browser, money/date and model evaluation gates pass.
- [ ] Provider/public OAuth/data-processing readiness complete for intended deployment; no hidden launch blockers.
- [ ] Clean self-host install reproduced by someone other than implementation author.
- [ ] Hosted deployment, migrations, scheduler, secrets, backups/restore, quota/budget, alerting and rollback usable.
- [ ] Export/delete/privacy/trust/license documentation matches actual behavior.
- [ ] Release report lists deployed SHA/schema/model/flags, test evidence, owner, known limitations and rollback procedure.
- [ ] Demo and submission materials describe implemented behavior and actual runtime technologies.

A required failed gate blocks release. Do not mark it complete because a demonstration works once or a deadline is approaching.
