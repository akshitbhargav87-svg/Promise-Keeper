# A10 — Integration quality, operations and release

Owns CI, `infra/`, integrated/e2e tests, `docs/runbooks/`, help/demo/ops features and S23/S25/S26. Coordinates releases; it does not replace feature owners' validation. Planning tools are maintained here after initial setup.

Start with planning CI, scenario catalog and synthetic demo definitions. Final release requires every area's real integration and reviews. Keep release readiness separate from hackathon submission timing.

### A10-T01 — Establish CI and executable quality gates

Preserve planning/link/board/coordinator checks and add app install/lint/type/build/contract/test stages once A01 lands. Add secret scanning/dependency review tools supported by repository permissions, PR templates and actual-owner CODEOWNERS setup guidance.

Acceptance: clean checkout planning CI passes on Linux and Windows; later app jobs cannot silently skip failing checks; no private credentials in fixtures; branch protections recorded separately from file configuration; check commands reproducible locally.

### A10-T02 — Build journey and isolation integration harness

Implement J01–J12 from docs/QUALITY.md using real local services and controlled provider fixtures, clock injection, deterministic seeds and tenant canaries. Add UI accessibility and browser matrix plus focused load/failure tests.

Acceptance: retries/conflicts/deletion/permissions tested behaviorally; suite doesn't merely mirror implementation; live-provider tests are separately labeled and never faked by fixtures; test logs/artifacts redact evidence/tokens; failed journey produces useful reproduction.

### A10-T03 — Build honest demo and help

Build S25 synthetic tenant/clock/reset/guided scenarios with disabled live connections/outbound actions, and S23 task-based guides/troubleshooting/search. Produce demo fixture asset pipeline with no real brand/account data.

Acceptance: demo reset affects only demo; production cannot enter time travel; fixtures visibly labeled; all guided links work; help covers known provider/model limitations; manual path usable without Gmail access.

### A10-T04 — Implement deployment, backups and budget controls

Create tested self-host Compose profile and chosen hosting deployment profile with web/worker/DB/storage/scanner, secrets, migrations, health, quotas, rollback and restore. Work with the project owner on region/budget, and A01/A09 on retention and key handling.

Acceptance: clean isolated install reproduced; worker schedules run after restart; DB/object restore with tombstones verified without sending alerts; preview isolated from production; measured load/provider costs and scaling/rollback documented; paid resources only created with actual authorization.

### A10-T05 — Implement operator health and incident runbooks

Build S26 aggregate health/queue/provider/watch/storage/backup views and audited retry/cancel. Write runbooks for worker down, provider outage/quota, lost mail cursor, key rotation, purge failure, bad prompt release, corrupted evidence and rollback.

Acceptance: operator role required; no inbox bodies/tokens/prompts exposed; representative outage drill yields actionable UI and successful recovery; no false monitoring-active state; alert noise/rate limits sensible.

### A10-T06 — Complete product, accessibility and launch materials

Audit every screen against PRODUCT.md, mobile/Hindi/keyboard/zoom, public trust claims, licenses/notices, dependency inventory, demo narrative, screenshots and submission worksheet. Use actual runtime model/tool evidence, not planned technologies.

Acceptance: no orphan routes/CTAs/unsupported claims; source/recovery/privacy methodology accurate; licensed assets recorded; live demo and README match deployed revision; official event/category facts rechecked before submitting; no automatic submission.

### A10-T07 — Execute complete-release gate and handoff

Run all release gates in docs/QUALITY.md, verify seventy task reviews and merged areas, produce release report with deployed SHA/schema/model/config, unresolved risks, restore evidence and rollback owner. Complete the live board only with actual reviews/evidence.

Acceptance: every required gate passes or release is explicitly blocked; no mock production adapter; real-provider readiness and operational ownership verified; clean self-host install and documented deployment usable by someone outside team; final release artifacts and current board agree.
