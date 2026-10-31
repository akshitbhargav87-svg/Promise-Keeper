# A04 evaluation and integration status

This is a synthetic smoke suite, not a statistically meaningful model accuracy study. Held-out rows are small and are not used for prompt tuning. No live model has run because no credential or self-hosted endpoint was supplied.

| Gate | Local evidence | Status |
|---|---|---|
| Schema and source validation | Node adapter/extraction tests; adversarial fake span is rejected | Pass for covered cases |
| Amount arithmetic | integer minor-unit tests including INR, JPY and negative USD | Pass for covered cases |
| Explicit dates/business days | unknown preserved without pinned calendar; holiday fixture tested | Partial; timezone-aware instant/DST cases need shared date library |
| Comparison | INR 199→349 gives INR 150; mismatched period/workspace insufficient | Pass for covered cases |
| Hindi extraction | Prompt/fixture included; no live provider run | Not measured |
| Model held-out accuracy | Four synthetic cases only; no labeled model outputs | Not measured; thresholds cannot be claimed |
| Live provider/model/latency/cost | No credentials; no real provider call | Blocked |
| End-to-end worker/evidence/domain integration | A01/A03/A05/A06/A09 capabilities not yet integrated | Blocked by dependencies |

No claim of 95% amount accuracy, 90% date accuracy, citation entailment, or production readiness is made. Model, prompt and schema versions are attached to each adapter result; callers must persist that metadata with the extraction revision.
