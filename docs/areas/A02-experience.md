# A02 — Design system, navigation and home

Owns `packages/ui/`, public landing, root app layout/navigation, shared error/offline states, and S04 home composition. Feature owners own their screens using these components. Shared tokens change only through A02-reviewed changes.

Start against synthetic summaries. Final integration needs A01 web/runtime, A09 principal/onboarding, and domain summary ports from A03/A05/A06/A08.

### A02-T01 — Define foundations and accessible primitives

Implement semantic light/dark tokens, typography and licensed local Hindi-capable fonts, spacing/layout scales, icons, buttons, inputs, labels/errors, chips, cards, dialogs/sheets, tables, toasts and skeletons. Agree the common UI dependencies once and provide component examples.

Acceptance: contrast measured, target size/focus/labels correct, reduced motion respected, no external font/logo tracking, long Hindi text and money/dates fit; component state gallery includes loading/error/disabled variants with reasons.

### A02-T02 — Build responsive shell and navigation

Implement desktop sidebar/rail, mobile bottom navigation/More, header, breadcrumb, global-search launch, Add capture launch, profile menu, workspace context, skip link and route-focus behavior. Include 404/403/offline/maintenance pages and persistent preference ports.

Acceptance: every planned destination navigates to a real route or explicit pending feature state during development; keyboard/mobile back behavior works; content remains usable at 360px/200% zoom; no implementation-only messaging in the final user flow.

### A02-T03 — Build landing and public product presentation

Implement S01 with original accessible copy, synthetic product imagery, demo/get-started routes, how-it-works, privacy/open-source explanation and footer links. Preserve auth return context without passing private content in URLs.

Acceptance: all CTAs go somewhere meaningful; mobile hero works; no invented testimonials or performance outcomes; trust links connect to A09 pages via agreed routes; licensed assets documented.

### A02-T04 — Build home attention and summary composition

Implement S04 against typed summary adapters: review, deadlines, subscription forecast by currency, recent promises, connection health, and confirmed outcomes. Distinguish loading from real zero, and missing provider data from empty results.

Acceptance: a fixture with several competing deadlines yields the defined attention order; each card opens the canonical record/filter; unknown/estimated dates are labeled; currency groups and confirmed/potential amounts remain separate; no unusable chart for empty state.

### A02-T05 — Standardize record interaction patterns

Provide reusable page header, filter/sort state, source citations, timeline, conflict panel, empty states, action review card, date/money controls, and evidence viewer layout wrappers. Publish usage examples that domain owners can copy without redefining business logic.

Acceptance: shared keyboard/focus/dialog patterns pass checks; URL filters/back position are stable; nested click targets avoided; uncertainty and source-deleted cases are represented; shared components do not import feature repositories.

### A02-T06 — Complete responsive and language polish

Audit the assembled shell/home/landing and review feature screenshots with owners for visual consistency. Address 360/768/1280/1920px, long names, Hindi, empty/partial failures, focus order, zoom, dark/system mode, reduced motion, and notification badge behavior.

Acceptance: agreed screen checklist and manual keyboard results recorded; contrast failures fixed; no visual-only date/status meaning; UI does not obscure contextual primary actions or retain excessive sidebar density on mobile.

### A02-T07 — Integrate real summaries and verify experience

Replace home mocks with actual domain summaries/auth/preferences, test first-use and returning-user journeys, verify deep links and capture/search launches with real route owners. Keep synthetic gallery isolated from app data.

Acceptance: S01/S04 and shared system screens satisfy PRODUCT.md; J01/J10 navigation portions pass with actual services; no mock production summaries; browser/device checks and screenshots reviewed; merged PR and reusable component handoff on board.
