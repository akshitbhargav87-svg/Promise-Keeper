# Promise Keeper: complete product and execution specification

Version 1.0 · 31 October 2026 · Status: approved planning baseline; implementation pending.

## 1. Product definition

Promise Keeper is a private memory of commitments that companies make to an individual. Users capture screenshots, emails, receipts, bills, support conversations, and offer terms. The product connects those sources to a brand and a structured promise, tracks deadlines, compares later evidence, and prepares an evidence-backed next action.

The organizing loop is **capture → review → remember → monitor → compare → act → resolve**. Chat and automatic email tracking are two entry points into the same records. Brands, promises, subscriptions, offers, alerts, and disputes must never become isolated databases that users have to reconcile themselves.

The product is a consumer tool, initially optimized for India, INR, English, Hindi, and Asia/Kolkata. Currency, timezone, locale, and business calendars are explicit fields so other regions can work without rewriting the domain. The first complete release is a responsive website/PWA, with a hosted profile and a self-hosted profile. A native mobile application is a later separate delivery, not a hidden requirement for the website.

### 1.1 Product outcomes

- A first-time user can upload a screenshot and save a reviewed promise without connecting an inbox.
- A returning user can identify their next important action within one home screen.
- Every AI-extracted amount, deadline, and condition can be traced back to a source location.
- Users can see every relationship with a brand: promises, payments, offers, subscriptions, evidence, and open cases.
- Automatic monitoring is visible and controllable: what is connected, what was checked, when it last worked, and what needs attention.
- Chat can answer questions over the user's records and propose changes without bypassing the normal review flows.
- Recovery, predicted savings, confirmed refunds, and disputed amounts are reported separately.

### 1.2 Core users and situations

| User | Situation | Desired result |
| --- | --- | --- |
| Subscriber | A trial converts next week | See the exact cutoff and cancellation route before being charged |
| Shopper | A refund was promised in five working days | Know the supported due date and prepare a follow-up when overdue |
| Customer | A plan was advertised at a locked price | Compare the original terms with a new invoice, including tax and billing period |
| Offer holder | Cashback requires spending and expires soon | See eligibility, required steps, cap, and remaining uncertainty |
| Busy inbox owner | Promises are buried in email | Review a concise queue of candidate records instead of searching the whole inbox |
| Privacy-conscious user | Bills contain personal information | Understand processing mode, retention, permissions, and export/delete options |

### 1.3 Product principles

1. Evidence precedes conclusions. “Possible mismatch” is useful; unsupported accusations are not.
2. The main screen tells users what to do next. Advanced filters, model details, and long histories are progressive disclosures.
3. Records have one canonical detail route. Cards, alerts, search, brand pages, and chat link to it.
4. Drafts are editable; external actions are reviewed. Never disguise a drafted cancellation as a completed cancellation.
5. Automation reduces repetitive work while exposing uncertainty and failures.
6. Original documents remain immutable. User corrections and extraction revisions are additions with history.
7. Accessibility, mobile layout, and empty/error states are part of a feature's definition of done.

### 1.4 Scope boundary and assumptions

Included in the full website: manual capture; screenshots/PDFs/text/EML; Gmail and Microsoft mail connectors; review queue; brand registry; all promise categories; subscriptions; offers; grounded chat; charge comparisons; reminders; notification center; cases and draft complaints; export/import; personal settings; privacy controls; operator health tools; demo workspace; hosted and self-hosted deployment instructions.

Later expansion with its own requirements: native mobile apps, shared household workspaces, bank transaction aggregation, browser-extension capture, merchant-side accounts, paid Promise Keeper plans, verified public brand rankings, automated browsing of private merchant accounts, and direct complaint sending. The complete first release does not depend on these. Subscription tracking means **the user's subscriptions to brands**, not charging users a Promise Keeper membership. Public marketing has no invented pricing tiers.

Offers are user-saved or extracted from consented sources. There is no invented public marketplace, unauthorized scraping, or promise that all offers are currently valid. Cancellation assistance means instructions, reminders, drafts, and user-reported/verified evidence of cancellation; it does not claim to cancel a third-party service automatically.

## 2. Information architecture

### 2.1 Primary navigation

Desktop: 248px left sidebar; flexible main content; optional contextual inspector. Sidebar: logo/workspace switch, Home, Assistant, Review inbox (count), Promises, Brands, Subscriptions, Offers, Evidence, Action center, then Notifications, Settings, Help, and profile. Collapse to a 72px labeled-on-hover rail if the user chooses. Persist preference per user, not globally.

Mobile: bottom tabs Home, Assistant, Review, Promises, More. More opens the remaining destinations as a sheet with names and counts. A consistent Add button opens capture; it never hides the currently focused form. Respect device safe areas. Tablet uses a collapsed rail and full-width sheets.

Top bar: breadcrumb/page title, global search, Add evidence, notification bell with unread indicator, profile menu. Search uses a button on narrow widths. A disconnected-provider warning appears in the affected workspace and relevant pages, not as a permanent warning on unrelated records.

### 2.2 Route map

| ID | Route | Screen/owner |
| --- | --- | --- |
| S01 | `/` | Public landing / A02 |
| S02 | `/sign-in`, `/auth/error`, `/auth/verify` | Access / A09 |
| S03 | `/onboarding` | Setup wizard / A09 with A02 shell |
| S04 | `/app` | Home / A02 with domain summaries |
| S05 | `/app/assistant`, `/app/assistant/:threadId` | Assistant / A07 |
| S06 | `/app/review` | Review inbox / A03 |
| S07 | `/app/capture` | Capture / A03 |
| S08 | `/app/review/:candidateId` | Extraction review / A03 with A04 output |
| S09 | `/app/promises` | Promise explorer / A05 |
| S10 | `/app/promises/:id` | Promise detail / A05 |
| S11 | `/app/brands` | Brand directory / A05 |
| S12 | `/app/brands/:id` | Brand detail / A05 |
| S13 | `/app/subscriptions` | Subscription overview / A06 |
| S14 | `/app/subscriptions/:id` | Subscription detail / A06 |
| S15 | `/app/offers`, `/app/offers/:id` | Offer overview/detail / A06 |
| S16 | `/app/evidence`, `/app/evidence/:id` | Vault/viewer / A03 |
| S17 | `/app/connections`, `/app/connections/:id` | Email connections and sync / A03 with A09 authorization |
| S18 | `/app/actions`, `/app/actions/:caseId` | Cases and draft composer / A08 |
| S19 | `/app/notifications` | Notifications / A08 |
| S20 | `/app/calendar` | Deadlines calendar/list / A08 |
| S21 | `/app/search?q=...` | Global search / A07 |
| S22 | `/app/settings/:section` | Profile, preferences, privacy, security / A09 |
| S23 | `/app/help`, `/app/help/:article` | Help and troubleshooting / A10 |
| S24 | `/app/reports` | Spending and outcomes / A06 |
| S25 | `/demo` | Synthetic demo workspace / A10 |
| S26 | `/ops` | Restricted operator health / A10 |
| S27 | `/privacy`, `/terms`, `/accessibility` | Public trust pages / A09 with A10 |

`/app` routes require a real authenticated workspace. Demo has a separately seeded tenant, no live mail connection, no credentials, and no outbound actions. Not-found, access-denied, expired-share, offline, and maintenance pages are part of the shell. There is no public evidence share in v1; private expiring downloads require authentication.

## 3. Design system and interaction rules

### 3.1 Visual direction

Calm and legible, with white/soft-neutral surfaces, dark navy text, restrained teal emphasis, and clear evidence hierarchy. Avoid a dense finance dashboard or a chat-only layout. The first viewport contains the next action, not decorative charts. Use one locally hosted, licensed sans-serif family with a Devanagari-capable fallback; A02 selects and records the exact family after testing. No runtime third-party font requests containing user context.

Proposed semantic tokens: canvas `#F6F8FA`; surface `#FFFFFF`; text `#142534`; muted text `#526274`; border `#D7E0E7`; accent `#0B766E`; accent soft `#E7F5F2`; warning text `#854D0E`; danger text `#B42318`. These are baseline values; A02 measures contrast for each actual foreground/background pair. Dark mode defines semantic counterparts, not automatic inversion.

Spacing: 4/8/12/16/24/32/48/64px. Body: 16px/24px; supporting: 14px/20px; page title: 28px/36px; display: 40px/48px; numeric summaries: 28px with tabular numerals. Cards 12px radius, controls 8px, subtle shadows only for elevated surfaces. Content max width 1440px; reading/assistant column max 760px. Keep comfortable line lengths and avoid all-capital paragraphs.

### 3.2 Component inventory and exact behavior

| Component | Required elements | Behavior and variants |
| --- | --- | --- |
| App shell | Sidebar, header, main landmark, skip link | Route focus on heading; no keyboard traps; menu collapses predictably |
| Page header | Title, one-sentence context, primary action, optional secondary actions | One visually dominant action; actions wrap below title on mobile |
| Button | Text, optional icon, loading indicator | Primary/secondary/quiet/destructive; visible focus; disabled reason adjacent |
| Form field | Label, input, help, error | No placeholder-only labels; errors connected by ID; retain values after failure |
| Search/combobox | Query, suggestions, selected value, clear | Arrow navigation, Enter, Escape; announce results and loading |
| Filter bar | Query, state, date, brand, sort, clear | URL-synced filters; count active filters; mobile sheet with Apply/Clear |
| Promise card | Brand/name, status text, deadline, value, source count, next action | Entire title link; actions separate; no nested clickable regions |
| Status chip | Icon plus readable label | Never color alone; consistent domain meanings in every view |
| Confidence control | Needs review/Reviewed, supporting reason, source link | No unsupported precision; field-level issues visible in review |
| Evidence citation | Source title, date, excerpt/page/region | Opens viewer at source location; handles deleted/restricted source |
| Timeline item | Event type, actor, occurrence time, evidence | Distinguish source date from upload date and system detection time |
| Empty state | Reason, clear next step, optional example | Separate truly empty, filtered empty, permission limited, and offline |
| Error panel | Plain explanation, retained work, retry/help | Correlation ID copy; no credentials or raw provider responses |
| Toast | Short result, optional Undo | 5s minimum for noncritical info; important changes also in page history |
| Drawer/dialog | Title, close, body, footer | Focus trap and restore; Escape unless saving; unsaved-exit warning |
| Data table | Labeled columns, row actions, pagination | Responsive cards or horizontal scroll with header association |
| Date control | Date/time/timezone, exact versus approximate | Displays original wording and normalization; no invented deadline |
| Money control | Amount, currency, frequency/context | Locale formatting; numeric validation; no silent currency conversion |
| Attachment uploader | File list, type/size, progress, retry/remove | Drag-drop plus keyboard file chooser; independent per-file errors |
| Activity indicator | Last success, current job, next check | “Monitoring active” only if the worker has a recent valid heartbeat |
| Action review card | Proposed changes, affected records, source, confirm/cancel | Server validates revision and authorization at confirmation |
| Skeleton | Layout-matched placeholders | Reduced-motion preference; never changes a real zero into a loading zero |

### 3.3 Shared quality requirements

- Minimum control target 44px; WCAG 2.2 AA acceptance target; visible keyboard focus; screen-reader labels; no hover-only information.
- Verify at 360px, 768px, 1280px, and 1920px, at 200% zoom, with keyboard navigation and English/Hindi content.
- Critical updates use polite live regions. Destructive confirmations state exactly what is affected and whether reversal is possible.
- Dates show local date/time/timezone. Absolute date is available beside relative wording. “Tomorrow” never stands alone on a durable record.
- All list screens implement initial loading, pagination loading, empty, filtered empty, partial failure, full failure, retry, and unauthorized states.
- All editors implement clean, dirty, validating, saving, saved, conflict, offline, and failure states. Draft recovery cannot store raw evidence in an unsafe browser cache.
- Prefer optimistic UI for reversible preference changes; use server confirmation for record deletion, status transitions, evidence linking, or outbound actions.
- Browser back restores list position and filters. Deep links work from notifications. URL parameters contain record IDs/filter terms, never source email bodies or tokens.
- Feature flags render an honest availability explanation. Never show a live connector as connected in demo mode.

## 4. Screen-by-screen specification

### S01 — Landing

Header: Promise Keeper logo, How it works, Privacy, Open source, Sign in, primary Get started. Hero: concrete promise-memory statement, Upload a screenshot CTA, Try demo secondary CTA, product screenshot with synthetic data. Below: three-step capture/monitor/act explanation; four examples (trial, refund, locked price, cashback); evidence/privacy explanation; open-source/self-hosting link; FAQ; footer with legal/accessibility/contact links.

Get started goes to sign-in, preserving only a safe return route. Try demo goes to the isolated demo. No fabricated testimonials, customer logos, recovered-money totals, or claims of automatic cancellation. On mobile, hero copy precedes image; primary CTA stays above the fold where practical.

### S02 — Sign in, verification, access errors

Single centered panel: identity provider buttons configured by deployment; email magic link if enabled; terms/privacy links; return-to-demo. Separate authentication from mail-reading consent: signing in with Google does not connect Gmail. Show submitting, email sent, expired link, provider denied, account mismatch, and retry states. Validate return URLs server-side. Rate-limit sign-in and hide account enumeration. Verification view includes resend with cooldown and Change email. Auth error page preserves no secret query values in logs.

### S03 — Onboarding

Four short steps with progress and Back: (1) display name, region, timezone, language, currency; (2) choose Upload first or Connect email or Explore demo; (3) explain actual processing mode and source retention, collect required provider-processing consent separately; (4) set reminder channel/quiet hours and finish. Optional mail access can be skipped. Saving is per step and resumable. First upload may continue after setup without reselecting the file; use a temporary private upload, not a URL payload. Completion sends the user to review the first candidate or a useful home empty state.

### S04 — Home

Header “Your promises, in one place” with local date and Add evidence. First section “Needs your attention”: ordered actionable cards for review candidates, approaching hard cutoffs, possible overcharges, overdue refunds, and connection failures. Each shows why it matters, exact date, evidence status, and one next action.

Summary tiles: active promises, deadlines in next seven days, subscriptions due this month by currency, review queue count. Outcome summary distinguishes confirmed refunds from potential avoidable spend. Below: compact upcoming list, recently updated promises, and connection health. A collapsed “How tracking is doing” panel shows last successful sync and inference jobs. Widgets link to prefiltered canonical lists. Hide empty charts; show a concise start card. No repeated CTA for every zero-valued tile.

### S05 — Assistant

Layout: conversation list/new chat on desktop; centered conversation; collapsible selected-context panel. Header shows workspace, actual model/processing label in a details popover, and context scope (“All records” or selected brand/promise). Composer: multiline text, attachment button opening capture, send, stop generation, character/attachment limits; Enter sends, Shift+Enter inserts a line, user preference for Enter behavior.

Suggested starters: “What needs attention this week?”, “Which trials renew soon?”, “Compare this invoice with my plan”, “Show all promises from this brand.” Responses render concise text, evidence citations, domain cards, uncertainty, and optional action previews. Attachment processing is visible as a job; a failed upload does not erase typed text. Stream status is “Searching your records” / “Preparing answer”, with no exposure of hidden reasoning.

Read tools: scoped search, get promise/brand/subscription/offer/evidence excerpt, upcoming deadlines, comparison summary. Write proposals: save a reviewed candidate, create reminder, create draft, update record. A proposal renders exact changes and Confirm/Cancel; confirmation calls the domain API with current revision. Deleting data, canceling subscriptions, and sending messages are never performed implicitly by chat text. Stale context triggers refresh and another preview. Stop prevents future tools and preserves completed safe results.

States: empty thread, history loading, stream interruption with retry from last user message, provider unavailable, rate limit with wait guidance, insufficient evidence with request for specific missing source, deleted citation, unsupported intent, and inaccessible record. Rename/archive/delete thread in menu; deletion describes conversation/evidence retention separately. Chat history is private, exportable, and has its own retention setting.

### S06 — Review inbox

Unified queue for uploaded and auto-detected candidates; tabs All, Needs review, Possible duplicates, Failed. Filters: source, brand, kind, date, issue. Row: source preview, suggested brand/title/category, detected amount/deadline, issue labels, arrival time, source channel. Actions Review, dismiss as irrelevant, retry failed; batch dismiss requires selection and Undo where recoverable. Batch confirmation is allowed only for individually valid candidates with no unresolved critical fields; show exact count and effects. Unknown brand, contradictory terms, uncertain amount, or uncertain date require individual review.

Queue count reflects unresolved candidates, not raw email volume. Discard does not delete the original source unless separately requested. Duplicate handling offers link to existing evidence/promise, keep distinct, or dismiss; two commitments in one email remain two candidates. Inbox arrival during review does not move the current row under the user's pointer.

### S07 — Capture

Tabs Upload files, Paste text, Add manually, Import email. Upload supports PNG/JPEG/WebP, PDF, TXT, and EML; HEIC is explicitly unsupported until a converter is tested. Initial limits: 20MB/file, 10 files/batch, 50 PDF pages, configurable server-side with the active limits displayed. No arbitrary remote-URL fetching in v1.

Each attachment shows thumbnail/name/size, source date if known, language hint, progress, duplicate warning, Retry, Remove. Optional fields: existing brand, related promise, source type, note. Paste supports plain text plus source date/sender supplied by user; HTML is converted to safe text. Manual mode captures title, brand, category, amount/currency, original wording, due date semantics, conditions, reminders, source note; “No original evidence attached” remains visible.

After upload: virus scan → text/OCR → extraction → review, with durable job IDs and Cancel before analysis. Show which stages actually completed. User can navigate away and find results in Review. Failure offers retry from failed stage; unsupported file explains acceptable formats. An identical file within a workspace reuses stored bytes but allows a new evidence link after confirmation. No cross-workspace deduplication observable by users.

### S08 — Extraction review

Desktop split: source viewer left, editable candidate right. Mobile toggles Source/Details with a persistent Save action. Source viewer: zoom, rotate raster preview, page navigation, search recognized text, highlighted citation regions, accessible text view, download original if authorized. OCR mismatch can be reported without modifying the original.

Editable fields: brand match/create; title; promise type; promised amount/currency and tax context; start/end; deadline raw wording and derived rule; conditions/exclusions; related order/account reference masked; reminder preferences; linked subscription/offer; source citations. Required fields are title, a brand or explicit Unknown, type, and at least a source or manual-origin statement. Missing monetary/date fields are allowed when irrelevant; invented defaults are not.

Each critical field shows its source excerpt and review state. Ambiguous “Friday” asks which date/timezone. “Five working days” asks start event, applicable calendar, and whether start day counts. A price mismatch asks inclusive/exclusive tax and billing period. Multiple promises can be split and saved independently. Save confirms selected candidates in one idempotent transaction; discard leaves an auditable candidate decision. Concurrent edits show a diff and keep local form values.

### S09 — Promises explorer

Header with Add promise. View switch List/Board; board is optional presentation over the same status filters, not a second workflow. Search, brand, category, lifecycle, due range, attention state, amount currency, source filter, saved views. Default view: attention first, then upcoming confirmed deadlines. Columns/cards: title, brand, type, status, exact/estimated deadline, amount, evidence count, next action. Sorting is server-paginated and stable.

Lifecycle filters: draft/active/fulfilled/cancelled/archived. Attention filters are separate: review needed, due soon, overdue, possible mismatch, open case. Completed records do not vanish from brand history. Bulk actions: tag, archive, reminder changes; summarize effects and use per-record version checks. Never bulk “confirm breach” from model output. Export applies the same filters and uses an async job for large result sets.

### S10 — Promise detail

Header: brand backlink, title, lifecycle chip, attention indicator, Edit, contextual primary action, overflow archive/delete. Summary: original promise, exact amount/date, source citations, conditions, account/order reference, review state. Tabs: Overview, Evidence, Timeline, Comparisons, Actions. Overview shows next deadline/reminder and links to subscription/offer/case.

Evidence tab shows linked originals and Add evidence. Timeline distinguishes source occurrence, upload, user corrections, detected comparison, reminder delivery, and resolution. Comparison panel shows promised versus observed values, matched billing period, tax/currency/conditions, calculated delta, model explanation with citations, and missing information. Actions: Confirm mismatch, Not a mismatch with reason, Need more evidence. A new bill can amend an unresolved comparison but cannot erase historical findings.

Resolution dialog: fulfilled with evidence/date, cancelled with source or self-report, partially resolved with outstanding amount, or archived with reason. A disputed record remains active until a resolution is explicitly recorded. Delete explains evidence shared with other records and uses recoverable deletion before retention purge. Current version is required for writes.

### S11 — Brands directory

Grid/list toggle, brand search, categories, active relationship filter, sort by attention/name/recent activity. Brand card: name, verified-by-user domain if present, logo or initials, active promise count, next deadline, subscription amount grouped by currency, open cases. It represents the user's relationship, not a public reputation score.

Add brand: name, optional domain/category/support link. Similar names trigger suggested matches with domain and source evidence. “Amazon Pay” and a marketplace seller are not silently merged. User can keep both. Logos must be licensed or fall back to initials; do not leak user records to a third-party logo service. Merge has a preview of affected records, aliases, and an audit trail, with restoration support for relationship reassignment.

### S12 — Brand detail

Header identity, aliases/domain, Add evidence and Ask about this brand. Summary: active promises, possible mismatches, upcoming renewal, unresolved cases. Tabs Promises, Subscriptions, Offers, Evidence, Activity, Contact. A single brand-scoped filter applies consistently to all lists. Contact entries include user-supplied or source-backed support links and last checked date; no fabricated support address. Pin important brand and edit metadata. Empty tabs explain how to add the first record without suggesting a connection is broken.

### S13 — Subscription overview

Summary: upcoming charges per currency; active subscriptions; trials ending soon; annualized estimate with methodology. Tabs All/Trials/Upcoming/Cancelled; calendar/list toggle and search/brand/status/billing cadence filters. Card: brand/plan, next amount, cadence, next charge date, trial cutoff, payment method label masked, source freshness, alert state. Distinguish confirmed dates from predicted recurrence.

Add subscription opens a manual form or links an extracted promise. A subscription may have multiple promises (trial, price lock, refund). Unknown amount/cadence displays “Needs details”. Reports never treat a cancelled subscription's forecast as a confirmed refund. Payment processing and bank-account connection are outside v1.

### S14 — Subscription detail

Header plan, brand, status (trial/active/paused/cancel_requested/cancelled/ended/unknown), primary next action. Sections: billing schedule; next renewal and cutoff; plan terms and price history; linked promises; invoice/charge timeline; reminder rules; cancellation instructions/status; evidence. Edit cadence supports monthly/yearly/weekly/custom interval, anchor date, timezone, and month-end rule.

Cancel assistance wizard: show provider instructions/source URL → record user steps → attach confirmation → mark requested or confirmed. “Requested” does not suppress renewal warnings until confirmed or the user deliberately disables them. Pausing reminders never changes provider subscription state. Proration, tax, multiple seats, credits, and plan changes are explicit comparison factors. Price change creates a new effective-dated schedule; it does not rewrite old invoices.

### S15 — Offers overview and detail

Overview tabs Available/Saved/Used/Expired/Needs review, filters brand/type/expiry/eligibility, sort expiring first. Card: benefit, cap, expiry, required spend, eligible payment category, source and verification age. Hide/copy code/mark used/save reminder actions. Mask sensitive single-use codes until revealed. Link to original offer terms in the vault.

Detail: benefit calculation, minimum spend, maximum benefit, eligible users/products/cards, excluded dates/categories, start/end timezone, redemption steps, stacking rules, one-time versus recurring, claim deadline distinct from purchase deadline, cashback expected date. Eligibility is Yes/No/Unknown with reasons and user-supplied assumptions. Never infer the full bank-card number. Status available/used/expired/withdrawn/unknown is separate from eligibility. User-reported used records date/amount and optional receipt; later cashback becomes a linked promise. Expiry calculations re-evaluate when timezone/terms are corrected.

### S16 — Evidence vault and viewer

Vault rows: file/source title, type, sender or uploader, original date, capture date, size/pages, processing stage, linked records, retention state. Search recognized text only within the workspace; filters by type/brand/source/date/review. Upload and export selected. Viewer includes preview plus accessible text, source metadata, hash/integrity summary in details, linked records, extraction versions, and download. Hash supports integrity checks, not legal certification.

Original bytes are immutable. Redacted derivatives are separate assets with lineage and visual preview. Export defaults to redacted derivative where selected, with a review of included files. Removing a link is different from deleting the evidence. Deleting evidence linked to several records displays impact and leaves missing-source markers until a user resolves them. Antivirus quarantine never renders active content. EML remote images, trackers, scripts, and external resources never load automatically.

### S17 — Connections and email monitoring

Connection list: Gmail, Microsoft, Manual import. Each card: account label masked where appropriate, granted scope, include/exclude filters, backfill window, processing provider consent, state, last attempt, last success, cursor freshness, next check, queued/failed count, Pause/Resume/Sync now/Reconnect/Disconnect. New connection wizard explains access and processing before OAuth. Sign-in identity and connected mailbox may differ; ask user to confirm the selected account label.

Default backfill: 30 days, configurable 7/30/90 or selected range within tested limits. Filters: user-selected labels/folders and supported sender categories; optional exclusions. Explain that API permissions may cover the mailbox more broadly than the application's filters. Relevance filtering is not a reduced OAuth permission. Show preview counts before a large import and stop at configured quota with a resumable cursor.

Detail tabs: Activity, Rules, Privacy. Activity shows sanitized jobs/counts and replayable failed batches, never raw tokens. Rules allow labels/folders/senders/categories and excluded senders, with a preview over approved local samples. Privacy: retained originals, retention duration, remote processing, disconnect behavior. Default machine-extracted critical promises go to review; high-confidence inbox categorization may run automatically but does not confirm financial commitments without user review in v1.

Gmail uses delegated read access, incremental history, renewed watches and reconciliation; Microsoft uses delegated Mail.Read, folder delta cursors and renewable subscriptions. Notifications are hints, not authoritative message payloads. Validate notification origin, fetch through provider API, deduplicate, and checkpoint only after durable writes. Handle expired history/delta with bounded re-sync; disconnect invalidates pending jobs and revokes/forgets tokens. No mark-read, delete, send, or inbox mutation permissions. Exclude irrelevant mail before model processing as far as feasible; explain that relevance detection may itself inspect selected content.

Disconnect dialog: stop future processing immediately; offer Keep imported records or Delete imported source data with impact preview; imported cross-linked evidence follows retention/deletion rules. Reconnect preserves the account identity and cursor if safe, otherwise requests bounded resync. Provider quota and token failures become visible operational states, not “No new promises.”

### S18 — Action center and case composer

List tabs To prepare/Drafts/Awaiting response/Follow up/Resolved. Row: brand, case type, linked promise(s), disputed/expected amount, next date, stage, last event. Create case from a reviewed comparison, overdue promise, or manual record. Case summary contains facts, unanswered questions, source index, contact source, and desired outcome.

Composer: recipient field with provenance (user-entered or source-backed), subject, editable body, tone/language selector, citations/attachments list, redaction preview, desired outcome, follow-up date. Generated text only cites retained sources and user-confirmed facts. Distinguish user's allegation from verified document facts. Preview rendered export, missing source warnings, Copy text, Download evidence pack, Open email composer. V1 does not send email from the server or file official complaints. Opening an email composer does not mark the case sent.

Record sent is a deliberate user action with date/channel and optional confirmation evidence. Record response supports upload, classify response, update outstanding amount, next deadline, and partial/full resolution. Evidence pack: PDF summary plus originals/redacted derivatives and a manifest with IDs/dates/hashes; preserve source lineage, sanitize filenames, provide an accessible text summary. No legal guarantee or fabricated statute/helpline; official guidance is linked only after verification for the user's jurisdiction.

### S19 — Notification center

Filters All/Unread/Deadlines/Reviews/Connection health/Cases. Group by day with title, supporting context, exact date, source record link, and mark read/snooze/dismiss. Bulk mark read is reversible within normal use. Notification delivery and promise status are separate records. Snooze asks Until when, timezone, and whether only this alert or this reminder rule is affected. Critical deadline after snooze is clearly displayed.

Email alerts are opt-in and contain minimal record context by default, with an authenticated link. Settings specify immediate/digest/off, quiet hours, weekdays, timezone, and per-type channels. In-app is always available; browser push is optional and requested only after a user clicks Enable. Delivery failure appears in settings and system activity; retry must deduplicate by occurrence/channel. Marketing email is not bundled with functional alerts.

### S20 — Calendar and upcoming list

Month/week/list view switch; deadline kinds and brand filters; timezone label; accessible chronological list always available. Event shows brand, type, date precision, and record link. Click opens a summary drawer with source, reminder settings, and Open record. Estimated dates have an explicit label and different icon. Calendar exports are user-triggered ICS downloads with optional minimal titles; no public calendar feed containing private data. All-day events use calendar dates, timed events use timezone-aware instants. Date changes replace future reminder occurrences while preserving delivery history.

### S21 — Global search

Search input with keyboard shortcut; grouped results Promises/Brands/Subscriptions/Offers/Evidence/Conversations/Cases. Filters type, date, brand, source. Result snippet highlights the matching text and cites its source; restricted or deleted sources never leak snippets. Lexical search works without embeddings; semantic retrieval is an enhancement with evaluation. Assistant conversion (“Ask about these results”) explicitly shows selected scope. No-result view suggests less restrictive filters and manual capture. Log query metadata without raw sensitive queries by default.

### S22 — Settings

Profile: name/language/region/timezone/default currency. Appearance: light/dark/system, text density, reduced motion, navigation preference. Reminders: type/channel/digest/quiet hours/calendar. Connections: link to S17. Processing/privacy: active provider, local/hosted mode, consent version/time, source and conversation retention, export/import jobs, redaction default, analytics choice. Security: sessions, revoke session, sign-in methods supported by the auth deployment, activity summary. Account: export first, recoverable deletion grace period, purge schedule and backups explanation.

Changing timezone previews affected reminders without rewriting the original promise wording. Currency preference changes display defaults, not stored amounts. Retention changes preview affected sources and shared links. Export/import is versioned, scoped, and idempotent, with size limits and duplicate handling. Deletion freezes processing before scheduling purge. Export links are private, short-lived, and revocable. A self-hosted admin cannot advertise end-to-end encryption if the worker can decrypt documents for analysis.

### S23 — Help

Searchable guides: add first promise; review extraction; deadline/date rules; connect/disconnect email; explain possible mismatch; track cancellation; export evidence; manage privacy; troubleshooting jobs. Contextual Help links open the relevant section. Support report includes a user-reviewed sanitized diagnostic bundle only; never attaches evidence automatically. Connection troubleshooting distinguishes permission denied, expired token, provider outage, quota, and background worker unavailable.

### S24 — Reports

Date range and currency selector. Sections: subscription forecast, confirmed charges, trial cutoffs, confirmed recovered refunds, unresolved amounts, utilized offers, and review accuracy feedback. Methodology disclosure beside every derived metric. Weekly/monthly recurring costs are estimates calculated from explicit schedules, with no invented FX conversion. “Potential saving” is a scenario, requiring user acknowledgement of assumptions; do not add it to recovered money. Export CSV/JSON handles spreadsheet formula injection and exposes the applied filters. Charts have equivalent tables and meaningful empty states.

### S25 — Demo

Banner “Demo workspace — synthetic records”. Guided scenarios: capture promise; compare surprise charge; inspect trial cutoff; inspect overdue refund; generate evidence-backed draft. Clock controls are demo-only and visually obvious, so changing demo time cannot alter real schedules. Reset reseeds the demo tenant, never a user tenant. Provider/model response fixtures are labeled; a separate optional live-model demo requires configured credentials and consent and reports the actual model. No Gmail OAuth, external send, or production file upload from demo.

### S26 — Operator health

Deployment operators only, using an independent role check and audited access. Overview: web/DB/storage/worker health, job delay, failed jobs by type, connector watch expiry, provider rate limits, storage utilization, sanitized error IDs, backups/restore verification age. Drill-down is operational metadata; no default browsing of personal evidence or inbox bodies. Retry/cancel failed jobs with reason and tenant scope. Never expose tokens or model prompts in this dashboard. Health endpoints used by infrastructure reveal minimal information.

### S27 — Trust pages and system screens

Privacy describes actual data categories, purposes, processors, retention, export/delete, local versus hosted behavior, and contact. Terms describe service behavior without promising refund outcomes; implementation needs jurisdiction-appropriate review before public launch. Accessibility statement lists target, tested coverage, known issues and reporting route. Maintenance/offline/404/403 pages provide a safe next route and preserve user work where possible. No cache of private documents in the offline PWA shell by default.

## 5. Domain rules and state machines

### 5.1 Evidence and candidate lifecycle

Evidence processing: `uploaded → quarantined/scanning → ready → extracting → extracted`; terminal failure may be retried from an identified stage. Quarantined is not previewable. Deletion is `active → deletion_scheduled → purged`, with retention grace and legal hold only if explicitly supported/documented by deployment. Original objects cannot be overwritten; derived OCR/redactions carry version/parent IDs.

Candidate: `pending_review → confirmed | dismissed | linked_duplicate`; `failed` is a processing failure with retry details. Candidate confirmation atomically creates/links the promise/subscription/offer, provenance, initial timeline event, and future reminder intents. Idempotency prevents double-clicks from creating duplicate promises. A candidate with several commitments has individually addressable children.

### 5.2 Promise lifecycle versus attention

Lifecycle: `draft → active → fulfilled | cancelled | archived`; reopening requires a reason and history. Draft and active may be archived. Deletion is an orthogonal retention state. Attention is computed, not a lifecycle override: review_needed/due_soon/overdue/possible_mismatch/open_case. “Overdue” applies only when the due date/rule is sufficiently confirmed and the promised outcome is unfulfilled. A comparison may flag price discrepancy without a deadline. A possible mismatch is not a legal determination.

Deadline model: original wording; anchor event/date; unit calendar_days/business_days/calendar_date/instant/unknown; count; calendar ID/version; start-day inclusion; timezone; exact/estimated/unknown; earliest/latest dates if ambiguous. Preserve all inputs. Only confirmed exact dates create hard-cutoff language. Estimated deadlines create an uncertainty-labeled reminder. Unknown dates request review. Holiday changes do not silently rewrite an agreed historical rule.

### 5.3 Matching and comparison

Match candidates by workspace, brand aliases, account/order references, currency, time period, plan, and evidence type. Title similarity alone never proves a match. Present possible matches when ambiguous. Compare money deterministically after normalization, not by an LLM subtraction. Evaluate tax, credits, discounts, seats, proration, billing interval, and offer eligibility before displaying a delta. Missing terms produce insufficient_evidence.

Comparison states: queued/running/needs_review/insufficient_evidence/confirmed_mismatch/dismissed/resolved. Model supplies cited candidate interpretation; deterministic rules supply arithmetic and status preconditions. User confirms/dismisses with reason. A later refund resolves the outstanding amount but does not delete the original comparison.

### 5.4 Brand identity

Workspace-scoped brands are canonical; source domains/names are aliases with provenance. Public catalog suggestions are optional read-only reference data, never the authority for merging user brands. Brand merges require user review of record reassignment and retain old IDs as redirects within the workspace. Source email domains can be spoofed; the product does not equate a logo or display name with authenticated merchant identity.

### 5.5 Offers and subscriptions

Subscription schedules are effective-dated. Month anchors retain intended day (31st → last day for February → 31st in March where configured), with timezone and end-of-month policy tested. Trial cutoff and renewal date are separate. Cancellation request and confirmed cancellation are separate. An offer's purchase deadline, redemption deadline, and cashback due date are separate fields. Offer benefit calculations require explicit caps and thresholds; unknown eligibility cannot become a guaranteed forecast.

### 5.6 Reminder scheduling

Default suggestions: 7 days, 1 day, and same-day before trial/offer hard deadlines; 1 day after an overdue refund plus configurable follow-up. User reviews rules; exact defaults may be selected during onboarding. For a deadline under 24 hours, avoid generating obsolete 7-day reminders. Resolve quiet hours by deferring routine alerts within allowed windows; show if a hard cutoff would precede delivery and let the user choose an exception. Store occurrence keys by rule+scheduled instant+channel; use an outbox and idempotent delivery. No exactly-once email delivery claim.

## 6. Full journeys and acceptance examples

| Journey | Steps | Required successful outcome |
| --- | --- | --- |
| J01 First promise | Sign in → skip email → upload price screenshot → correct tax context → save | One active promise, original source, linked brand, reviewed fields, visible timeline |
| J02 Auto email | Connect test mailbox → 30-day sync → extract two relevant emails → review one, dismiss one | Deduplicated candidates, correct cursor, no inbox mutation, clear last sync |
| J03 Locked-price mismatch | Add later invoice → select plan/period → compare → confirm difference | Cited side-by-side values, deterministic delta, case action |
| J04 Trial | Save trial date and cutoff → enable alert → simulate worker time in test → confirm cancellation evidence | Correct alert occurrence and no false confirmed cancellation |
| J05 Refund | Save five-working-day refund with calendar → due date passes → draft follow-up → record partial refund | Supported date, editable source-backed draft, remaining balance correct |
| J06 Offer | Save capped cashback → eligibility unknown → supply qualifying purchase → mark used | Cap/minimum checked, no premature guaranteed value, cashback promise linked |
| J07 Chat | Ask weekly attention → inspect citations → propose reminder → confirm | Only authorized records, same domain API, persisted reminder and audit event |
| J08 Disconnect | Pause sync → disconnect/delete imported source choice → receive delayed webhook | No new access, delayed job rejected by revoked connection version |
| J09 Export/delete | Export redacted case pack → delete shared evidence → undo during grace | Manifest correct, shared-link impact shown, restore respects versioning |
| J10 Cross-device | Open mobile deep link → edit record while desktop edits same version | Accessible mobile flow, conflict resolution without lost edits |
| J11 Tenant isolation | Guess another workspace's ID in URL/tool/vector/export | No content/snippets/presigned URL; scoped denial and sanitized audit |
| J12 Recovery | Worker crashes after provider response before checkpoint | Replay creates one durable candidate and no lost cursor segment |

## 7. Technical implementation blueprint

See docs/ARCHITECTURE.md for the topology and docs/CONTRACTS.md for implementable boundaries. The chosen baseline is one TypeScript monorepo, not ten independent apps. Next.js serves the UI and domain APIs; a separate Node worker performs long-running ingestion, extraction, comparison, reminders, and export. PostgreSQL is the transactional source of truth; S3-compatible private storage holds immutable files. PostgreSQL-backed jobs avoid introducing a separate queue service before it is justified. Search begins with full-text retrieval and can add pgvector after evaluation.

AI adapter baseline: Gemma 4 through the Gemini API, configured as `gemma-4-26b-a4b-it`, with an available-model/capability smoke test. Alternative self-hosted Gemma is selected explicitly and never silently bypassed. A provider capability matrix tests vision input, JSON behavior, context limits, cancellation/timeouts, rate limits, and source handling. All outputs are schema-validated regardless of provider-native structured output support. Hosted use requires deployment-specific privacy/policy validation before processing real connected-mail data. No API key is placed in the client.

The hosted architecture is **private, self-hostable, and local-inference-capable**, not automatically local-first or offline-first. The PWA caches the application shell only. A true browser-local evidence database and on-device multimodal runtime would be a separate future architecture effort. Self-hosting can keep files, database, and model inside the operator's infrastructure, subject to the selected email provider and deployment configuration.

## 8. Execution structure

Ten areas × seven ordered tasks = seventy application tasks. Each area owns vertical slices and its related server/worker code; shared boundaries are specified in advance. Every area can start with contracts/fixtures, but real integration and release gates depend on other areas. The single board records ownership and task progress. None of the application tasks is complete merely because this blueprint exists.

| Area | Scope | First task can start with | Final integration needs |
| --- | --- | --- | --- |
| A01 | Runtime, DB, storage, jobs, shared infrastructure | This repo | A09 access context; all schema contributions |
| A02 | Design system, navigation, landing, home | Synthetic summaries | A01 runtime; domain summary adapters; A09 auth |
| A03 | Capture, evidence, email, review | Source/AI fixture contracts | A01 infrastructure; A04 extraction; A05/A06 confirmation; A09 consent |
| A04 | Gemma extraction, matching, comparison, evaluations | Synthetic evidence | A01 jobs; A03 evidence; A05/A06 domain rules |
| A05 | Brands, promises, timelines, comparison review | Candidate fixtures | A01/A09 runtime/scope; A03/A04 evidence/comparison |
| A06 | Subscriptions, offers, reports | Promise and charge fixtures | A01/A09; A05 linking; A08 reminders |
| A07 | Assistant, scoped search, action previews | Mock domain tools | A04 provider; A05/A06 domain; A08 actions; A09 auth |
| A08 | Reminders, notifications, cases, packs | Deadline/comparison fixtures | A01 jobs; A03 originals; A05/A06 events; A09 consent |
| A09 | Identity, tenant isolation, privacy, lifecycle | Test principal contract | A01 DB/storage; every feature's scoped adapters |
| A10 | CI, integrated QA, deployment, docs, demo | Blueprint/tooling | All areas for release |

Suggested four-person starting wave: person 1 A01, person 2 A02, person 3 A03, person 4 A04. These are starting claims, not permanent portfolios. Rotate to A09 early for real access/consent, A05/A06 for domain persistence, A08 for monitoring/actions, and A07/A10 for assistant/integration. A person approaching an unavailable integration dependency publishes progress, blocks/releases the area, claims the prerequisite area if free, and later returns. Never require one area to be fully complete before starting another area's prerequisite implementation. The task-level dependency map and concrete three/four-person rotation are in [docs/INTEGRATION.md](docs/INTEGRATION.md).

### 8.1 Integration milestones (gates, not a reduced product)

1. **Contracts and skeleton:** root contracts/fixtures checked; A01 runtime builds; A02 shell navigates; A09 real request context works. Other areas have working mocks.
2. **Capture to memory:** upload → scan → extract → review → persist → brand detail, with tenant isolation.
3. **Monitoring:** both email providers, incremental retries, subscriptions/offers, calendar/reminders, visible health.
4. **Reasoning and action:** comparisons, grounded chat, confirmed tool actions, cases, exports.
5. **Complete experience:** all specified routes, mobile/accessibility/Hindi, privacy/export/delete, settings/help/reports, honest demo.
6. **Production readiness:** real-provider tests, restore rehearsal, retention purge, security gates, load/budget tests, deployment and rollback, launch documentation.

### 8.2 Definition of complete product

All seventy tasks have review and integration evidence; every screen's defined states work; no production routes depend on mock data; all journey/security/quality gates pass; deployed workers and schedulers are observable; data export and deletion work; a clean self-host install is reproduced; provider permissions and policies are ready for the intended audience; the deployed revision and model are recorded. The goal is testable completeness, not a claim that software can never fail.

## 9. Measurement and budgets

Track aggregate counts for capture completion, review completion, corrections by field, evidence citation coverage, useful alert feedback, duplicate rate, grounded-answer feedback, and confirmed case outcomes. Analytics are opt-in where appropriate; raw email text, filenames, chat questions, amounts, and recipients are excluded from default telemetry. A10 documents exact data handling.

Initial engineering targets, measured on a documented fixture/load profile: list/detail API p95 under 500ms excluding file/model work; warm page navigation under 1s on the agreed device/network; upload progress visible within 1s; async work acknowledged within 2s; 95% of normal one-page extraction jobs finish within 60s under admitted load; reminders queued within 5 minutes of schedule; no duplicate domain records under replay. These are acceptance targets, not current performance claims.

Set per-workspace quotas for file bytes, pages, jobs/day, concurrent model requests, token budget, export size, and notification rate. Show quota states and resumption. Provider cost/capability is measured during A04-T01; A10 sets a launch budget from actual pricing, without relying on an assumed free tier. Functional monitoring must survive model outages: known deadlines and stored evidence remain accessible.

## 10. Decisions and open validation

Decided: full responsive website, ten areas, seven ordered tasks per area, one coherent evidence/domain model, single Markdown coordination board on a dedicated Git ref, TypeScript/PostgreSQL/S3 baseline, Gemma adapter with explicit processing mode, no direct external complaint sending in v1.

To validate before the relevant release gate: actual hosting provider/region/budget; identity-provider configuration; tested package versions; Gemma account availability and capability limits; connected-mail processing policy compatibility and verification; Microsoft tenant restrictions; supported business-day calendars and holiday data; fonts/licenses; deletion/backups retention schedule; delivery provider setup; jurisdictional public trust-page review. Each has an owner/task in docs/DECISIONS.md. Agents may build adapter interfaces and fixtures while these validations are pending, but may not call the integration complete.

## 11. Source basis

The original shared chat described capture, persistent evidence, deadlines, later comparison, and complaint drafts. This specification incorporates the user's extensions: a full platform, chat, automatic email monitoring, brands, promises, offers, subscriptions, accessible UI, and work areas for parallel human/AI development. Research and source links are in docs/SOURCES.md. The hackathon context informs the demo and submission worksheet; its timing does not reduce this product's scope.
