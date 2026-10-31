/** A05 domain kernel. No persistence, auth bypass, UI or provider dependencies. */
export type Principal = Readonly<{ userId: string; workspaceId: string; roles: readonly string[]; sessionId: string }>;
export type SourceRef = Readonly<{ evidenceId: string; assetVersion: number; spanId: string }>;
export type Money = Readonly<{ minor: string; currency: string }>;
export type Lifecycle = 'draft' | 'active' | 'fulfilled' | 'cancelled' | 'archived';
export type Attention = 'review_needed' | 'due_soon' | 'overdue' | 'possible_mismatch' | 'open_case';
export type Kind = 'price_lock' | 'refund' | 'delivery' | 'trial' | 'warranty' | 'cashback' | 'offer' | 'subscription' | 'other';
export type Deadline = Readonly<{
  raw: string | null; precision: 'exact' | 'estimated' | 'unknown';
  kind: 'calendar_days' | 'business_days' | 'calendar_date' | 'instant' | 'unknown';
  date: string | null; timezone: string | null; anchor: string | null;
  count: number | null; calendarId: string | null; includeStartDay: boolean | null;
}>;
export type Brand = Readonly<{
  id: string; workspaceId: string; name: string; domain: string | null; version: number;
  aliases: readonly Readonly<{ value: string; source: SourceRef | null; reviewed: boolean }>[];
}>;
export type Terms = Readonly<{
  originalWording: string; money: Money | null;
  taxContext: 'inclusive' | 'exclusive' | 'unknown' | 'not_applicable';
  deadline: Deadline; conditions: readonly string[];
}>;
export type Revision = Readonly<{ version: number; terms: Terms; at: string; actorId: string; reason: string }>;
export type PromiseRecord = Readonly<{
  id: string; workspaceId: string; brandId: string; title: string; kind: Kind;
  lifecycle: Lifecycle; version: number; reviewed: boolean; manualOrigin: string | null;
  sources: readonly SourceRef[]; revisions: readonly Revision[];
}>;
export type Event = Readonly<{
  eventId: string; eventType: 'promise.changed.v1'; schemaVersion: 1;
  workspaceId: string; aggregateId: string; aggregateVersion: number;
  occurredAt: string; recordedAt: string; correlationId: string;
  payload: Readonly<{ lifecycle: Lifecycle; brandId: string; change: string }>;
}>;
export type TimelineEntry = Readonly<{
  id: string; workspaceId: string; promiseId: string; actorId: string;
  occurredAt: string; recordedAt: string; change: string; reason: string;
}>;
export class DomainError extends Error {
  readonly code: 'invalid' | 'not_found' | 'conflict';
  constructor(code: 'invalid' | 'not_found' | 'conflict', message: string) {
    super(message); this.name = 'DomainError'; this.code = code;
  }
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError('invalid', message);
}
export function assertScope(principal: Principal, resource: { workspaceId: string }): void {
  if (!principal.workspaceId || resource.workspaceId !== principal.workspaceId)
    throw new DomainError('not_found', 'Resource unavailable');
}
export function normalizeAlias(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
}
/** Suggestions only: equal display names never authorize an identity merge. */
export function suggestBrands(principal: Principal, name: string, brands: readonly Brand[]): readonly Brand[] {
  const key = normalizeAlias(name);
  return brands.filter(b => b.workspaceId === principal.workspaceId &&
    (normalizeAlias(b.name) === key || b.aliases.some(a => normalizeAlias(a.value) === key)));
}
export function planBrandMerge(principal: Principal, source: Brand, target: Brand): Readonly<{
  sourceId: string; targetId: string; sourceVersion: number; targetVersion: number;
  aliases: readonly string[]; requiresConfirmation: true;
}> {
  assertScope(principal, source); assertScope(principal, target);
  requireValue(source.id !== target.id, 'Cannot merge brand into itself');
  return { sourceId: source.id, targetId: target.id, sourceVersion: source.version, targetVersion: target.version,
    aliases: [...new Set([source.name, ...source.aliases.map(a => a.value)].map(normalizeAlias))], requiresConfirmation: true };
}
function assertInstant(value: string): void {
  requireValue(/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) && Number.isFinite(Date.parse(value)), 'Expected UTC timestamp');
}
export function validateTerms(terms: Terms): void {
  requireValue(terms.originalWording.trim(), 'Original wording is required');
  if (terms.money) {
    requireValue(/^(0|[1-9]\d*)$/.test(terms.money.minor), 'Promise money must be nonnegative integer minor units');
    requireValue(/^[A-Z]{3}$/.test(terms.money.currency), 'Currency code is required');
  }
  const d = terms.deadline;
  if (d.precision === 'exact') {
    requireValue(d.date && d.timezone && d.kind !== 'unknown', 'Exact deadline needs date, kind and timezone');
    // Interpretation/calendars belong to A04. This guard prevents claiming exactness without its inputs.
    if (d.kind === 'business_days') requireValue(d.anchor && d.calendarId &&
      Number.isInteger(d.count) && d.count! >= 0 && typeof d.includeStartDay === 'boolean', 'Incomplete business-day rule');
  }
}
export type Context = Readonly<{ principal: Principal; at: string; correlationId: string; newId: () => string }>;
export type Change = Readonly<{ record: PromiseRecord; event: Event; timeline: TimelineEntry }>;
function change(context: Context, record: PromiseRecord, description: string, reason: string): Change {
  assertScope(context.principal, record); assertInstant(context.at);
  return {
    record,
    event: { eventId: context.newId(), eventType: 'promise.changed.v1', schemaVersion: 1,
      workspaceId: record.workspaceId, aggregateId: record.id, aggregateVersion: record.version,
      occurredAt: context.at, recordedAt: context.at, correlationId: context.correlationId,
      payload: { lifecycle: record.lifecycle, brandId: record.brandId, change: description } },
    timeline: { id: context.newId(), workspaceId: record.workspaceId, promiseId: record.id,
      actorId: context.principal.userId, occurredAt: context.at, recordedAt: context.at, change: description, reason }
  };
}
export type ReviewedCandidate = Readonly<{
  title: string; kind: Kind; terms: Terms; sources: readonly SourceRef[];
  reviewed: boolean; manualOrigin: string | null;
}>;
export function createPromise(context: Context, brand: Brand, input: ReviewedCandidate,
  resolvedSources: readonly Readonly<{ ref: SourceRef; workspaceId: string }>[] ): Change {
  assertScope(context.principal, brand);
  requireValue(input.title.trim(), 'Title required'); validateTerms(input.terms);
  requireValue(input.sources.length || input.manualOrigin?.trim(), 'Source evidence or explicit manual origin required');
  for (const ref of input.sources) {
    requireValue(Number.isInteger(ref.assetVersion) && ref.assetVersion > 0 && ref.evidenceId && ref.spanId, 'Invalid source reference');
    const resolved = resolvedSources.find(s => s.ref.evidenceId === ref.evidenceId &&
      s.ref.assetVersion === ref.assetVersion && s.ref.spanId === ref.spanId);
    if (!resolved) throw new DomainError('not_found', 'Source unavailable');
    assertScope(context.principal, resolved);
  }
  const terms = structuredClone(input.terms);
  return change(context, { id: context.newId(), workspaceId: context.principal.workspaceId, brandId: brand.id,
    title: input.title.trim(), kind: input.kind, lifecycle: input.reviewed ? 'active' : 'draft', version: 1,
    reviewed: input.reviewed, manualOrigin: input.manualOrigin, sources: structuredClone(input.sources),
    revisions: [{ version: 1, terms, at: context.at, actorId: context.principal.userId, reason: 'Initial capture' }] },
    'created', 'Initial capture');
}
function current(context: Context, record: PromiseRecord, expectedVersion: number): void {
  assertScope(context.principal, record);
  if (record.version !== expectedVersion) throw new DomainError('conflict', 'Record changed; review current version');
}
export function reviseTerms(context: Context, record: PromiseRecord, expectedVersion: number, terms: Terms, reason: string): Change {
  current(context, record, expectedVersion); validateTerms(terms); requireValue(reason.trim(), 'Correction reason required');
  return change(context, { ...record, version: record.version + 1,
    revisions: [...record.revisions, { version: record.version + 1, terms: structuredClone(terms),
      at: context.at, actorId: context.principal.userId, reason }] }, 'terms_corrected', reason);
}
export function transitionPromise(context: Context, record: PromiseRecord, expectedVersion: number,
  target: Lifecycle, reason: string): Change {
  current(context, record, expectedVersion); requireValue(reason.trim(), 'Transition reason required');
  const allowed: Record<Lifecycle, readonly Lifecycle[]> = {
    draft: ['active', 'archived'], active: ['fulfilled', 'cancelled', 'archived'],
    fulfilled: ['active'], cancelled: ['active'], archived: ['active']
  };
  requireValue(allowed[record.lifecycle].includes(target), 'Invalid lifecycle transition');
  if (target === 'active') requireValue(record.reviewed, 'Review required before activation');
  return change(context, { ...record, lifecycle: target, version: record.version + 1 }, 'lifecycle_changed', reason);
}
/** Due flags only accept an A04-normalized, reviewed instant; unknown dates never become overdue. */
export function attention(record: PromiseRecord, flags: Readonly<{
  now: string; dueInstant: string | null; deadlineReviewed: boolean;
  dueSoonWindowMs: number; possibleMismatch: boolean; openCase: boolean;
}>): readonly Attention[] {
  assertInstant(flags.now);
  requireValue(Number.isFinite(flags.dueSoonWindowMs) && flags.dueSoonWindowMs >= 0, 'Invalid attention window');
  const output: Attention[] = [];
  if (!record.reviewed) output.push('review_needed');
  if (record.lifecycle !== 'active') return output;
  const terms = record.revisions.at(-1)!.terms;
  if (flags.deadlineReviewed && terms.deadline.precision === 'exact' && flags.dueInstant) {
    assertInstant(flags.dueInstant);
    const distance = Date.parse(flags.dueInstant) - Date.parse(flags.now);
    if (distance < 0) output.push('overdue');
    else if (distance <= flags.dueSoonWindowMs) output.push('due_soon');
  }
  if (flags.possibleMismatch) output.push('possible_mismatch');
  if (flags.openCase) output.push('open_case');
  return output;
}
export type Comparison = Readonly<{
  id: string; workspaceId: string; promiseId: string; promiseVersion: number;
  status: 'needs_review' | 'insufficient_evidence' | 'confirmed_mismatch' | 'dismissed' | 'resolved';
  decision?: Readonly<{ actorId: string; at: string; reason: string }>;
}>;
export function decideComparison(context: Context, record: PromiseRecord, comparison: Comparison,
  decision: 'confirmed_mismatch' | 'dismissed', reason: string): Comparison {
  assertScope(context.principal, record); assertScope(context.principal, comparison);
  requireValue(reason.trim(), 'Decision reason required');
  requireValue(comparison.promiseId === record.id, 'Comparison belongs to another promise');
  if (comparison.promiseVersion !== record.version) throw new DomainError('conflict', 'Recompare current promise terms');
  requireValue(comparison.status === 'needs_review', 'Comparison is not ready for a decision');
  assertInstant(context.at);
  return { ...comparison, status: decision, decision: { actorId: context.principal.userId, at: context.at, reason } };
}
