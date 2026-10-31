# A06 — Subscriptions, offers and reports

Owns `packages/commerce/`, subscriptions/offers/reports features and S13/S14/S15/S24. This tracks the user's brand subscriptions; implementing paid Promise Keeper billing is outside this area.

Start with synthetic promises/charges/offer terms. Final integration needs A01/A09 persistence and scope, A05 canonical brands/promises, and A08 scheduling.

### A06-T01 — Define commerce schemas and fixture ports

Implement subscription status, effective-dated schedules, charge versus prediction, trial/cutoff fields, offer eligibility/conditions/redemptions, report definitions and link handlers. Contribute migrations and summary/event ports.

Acceptance: unknown/estimated/confirmed represented; money grouped by currency; cancellation request distinct from confirmed; offer purchase/redeem/cashback dates distinct; fixtures cover proration, caps, multiple seats and no evidence.

### A06-T02 — Implement schedule and benefit engines

Build recurrence with anchor/end-of-month/timezone policy, yearly/weekly/custom schedules, trial cutoff, price changes and estimate methodology. Build deterministic min-spend/cap/eligibility calculations from explicit user/source inputs.

Acceptance: Jan31→Feb end→Mar31 configured behavior, leap years/DST, changing prices, negative credits, missing amounts, unknown eligibility and offer caps tested; no guessed date or FX conversion; forecast and confirmed charge never conflated.

### A06-T03 — Implement subscription overview and detail

Build S13/S14 cards/list/calendar, filters, manual/extracted creation, billing timeline, linked promises, history, reminders and source freshness. Cancellation wizard records instructions/request/confirmation without claiming provider action.

Acceptance: unknown schedule has useful next step; requested cancellation retains warnings; reminders off doesn't change subscription status; confirmed evidence and self-report distinguished; accessible mobile timeline and conflict behavior work.

### A06-T04 — Implement offers overview and redemption

Build S15 saved/used/expired/review filters, detail conditions, code reveal/copy, eligibility reasons, separate expiry dates and redemption steps. Link a used cashback offer to a canonical promise through A05.

Acceptance: expired/withdrawn offer cannot be shown as guaranteed available; unknown card eligibility doesn't require full card data; capped benefit correct; double redemption request idempotent; no unauthorized public marketplace/scraping.

### A06-T05 — Implement reports and outcome methodology

Build S24 forecast/confirmed-charge/recovery/utilized-offer/unresolved sections, date/currency controls, accessible tables/charts and safe CSV/JSON exports. Publish home and brand summary adapters.

Acceptance: no sum of unlike currencies; potential savings never added to recovered funds; cancelled future forecast excluded appropriately; source-backed versus predicted values visible; methodology and incomplete-data state explicit.

### A06-T06 — Wire reminders, source revisions and privacy

Emit schedule/offer change events, integrate reminder rules, update future occurrences when terms change, handle shared evidence and deletion/export, and propagate source corrections without rewriting historical bills. Add quota/error/partial state coverage.

Acceptance: revised date cancels/replaces only future intent; old deliveries remain; unconfirmed trial cutoff cannot become exact alert; privacy deletion removes derived report/index data; all commerce APIs enforce scope/version.

### A06-T07 — Verify trial, offer and billing journeys

Run J04/J06/J09/J10/J11 plus real reminder integration. Review invoice period/tax/proration behavior with A04/A05, reports under multiple currencies, mobile/keyboard and cancellation honesty.

Acceptance: no production commerce mocks; canonical links work across brand/chat/home/cases; integration evidence and reviewed methods recorded; merged PR and handoff posted on board.
