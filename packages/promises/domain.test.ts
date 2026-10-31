import test from 'node:test';
import assert from 'node:assert/strict';
import { attention, createPromise, decideComparison, DomainError, normalizeAlias, planBrandMerge,
  reviseTerms, suggestBrands, transitionPromise } from './domain.ts';
import type { Brand, Context, ReviewedCandidate, Terms } from './domain.ts';
import { confirmationHandler } from './confirmation.ts';
import type { PromiseTransaction } from './ports.ts';

const principal = { userId: 'user-a', workspaceId: 'workspace-a', roles: ['owner'], sessionId: 'test-session' };
let sequence = 0;
const context: Context = { principal, at: '2026-10-31T05:00:00Z', correlationId: 'request-test', newId: () => `test-${++sequence}` };
const brand: Brand = { id: 'brand-a', workspaceId: 'workspace-a', name: 'Nimbus Mobile', domain: 'nimbus.example', version: 1,
  aliases: [{ value: 'Nimbus', reviewed: true, source: null }] };
const terms: Terms = { originalWording: 'Monthly INR199 including tax, twelve periods', money: { minor: '19900', currency: 'INR' },
  taxContext: 'inclusive', conditions: ['same plan'], deadline: { raw: null, precision: 'unknown', kind: 'unknown', date: null,
    timezone: null, anchor: null, count: null, calendarId: null, includeStartDay: null } };
const ref = { evidenceId: 'source-a', assetVersion: 1, spanId: 'price-span' };
const input: ReviewedCandidate = { title: 'Monthly price lock', kind: 'price_lock', terms, reviewed: true, sources: [ref], manualOrigin: null };
const sources = [{ ref, workspaceId: principal.workspaceId }];
const create = () => createPromise(context, brand, input, sources);
const code = (expected: string) => (error: unknown) => error instanceof DomainError && error.code === expected;

test('brand names/aliases suggest scoped identities but never merge automatically', () => {
  assert.equal(normalizeAlias('  NIMBUS　 MOBILE '), 'nimbus mobile');
  const other = { ...brand, id: 'private', workspaceId: 'workspace-b' };
  assert.deepEqual(suggestBrands(principal, ' nimbus ', [brand, other]), [brand]);
  const target = { ...brand, id: 'brand-b', name: 'Nimbus Billing' };
  const plan = planBrandMerge(principal, brand, target);
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.sourceVersion, 1);
  assert.equal(brand.name, 'Nimbus Mobile');
  assert.throws(() => planBrandMerge(principal, brand, other), code('not_found'));
  assert.throws(() => planBrandMerge(principal, brand, brand), code('invalid'));
});
test('capture emits same-workspace aggregate, timeline and sanitized outbox envelope', () => {
  const result = create();
  assert.equal(result.record.lifecycle, 'active');
  assert.equal(result.event.aggregateId, result.record.id);
  assert.equal(result.timeline.promiseId, result.record.id);
  assert.equal(result.event.aggregateVersion, 1);
  assert.equal(result.event.schemaVersion, 1);
  assert.equal(result.event.workspaceId, principal.workspaceId);
  assert.equal(JSON.stringify(result.event).includes('19900'), false);
  assert.equal(result.record.sources[0].evidenceId, 'source-a');
});
test('brand and evidence links cannot cross tenants or source versions', () => {
  assert.throws(() => createPromise(context, { ...brand, workspaceId: 'workspace-b' }, input, sources), code('not_found'));
  assert.throws(() => createPromise(context, brand, input, [{ ref, workspaceId: 'workspace-b' }]), code('not_found'));
  assert.throws(() => createPromise(context, brand, input, [{ ref: { ...ref, assetVersion: 2 }, workspaceId: principal.workspaceId }]), code('not_found'));
});
test('manual origin is explicit; unreviewed captures are drafts', () => {
  assert.throws(() => createPromise(context, brand, { ...input, sources: [] }, []), code('invalid'));
  const draft = createPromise(context, brand, { ...input, reviewed: false, sources: [], manualOrigin: 'Typed by user' }, []).record;
  assert.equal(draft.lifecycle, 'draft');
  assert.throws(() => transitionPromise(context, draft, 1, 'active', 'Activate'), code('invalid'));
});
test('money rejects floating minor units; source wording and correction history survive revision', () => {
  assert.throws(() => createPromise(context, brand, { ...input, terms: { ...terms, money: { minor: '199.50', currency: 'INR' } } }, sources), code('invalid'));
  const record = create().record;
  const amended = reviseTerms(context, record, 1, { ...terms, conditions: ['corrected term'] }, 'User correction');
  assert.equal(record.revisions.length, 1);
  assert.equal(amended.record.revisions.length, 2);
  assert.equal(amended.record.revisions[0].terms.originalWording, terms.originalWording);
  assert.deepEqual(amended.record.revisions[0].terms.conditions, ['same plan']);
  assert.equal(amended.event.aggregateVersion, 2);
  assert.throws(() => reviseTerms(context, amended.record, 1, terms, 'Stale client'), code('conflict'));
});
test('all terminal lifecycles reopen explicitly without erasing prior terms', () => {
  for (const target of ['fulfilled', 'cancelled', 'archived'] as const) {
    const closed = transitionPromise(context, create().record, 1, target, 'User recorded outcome').record;
    assert.equal(closed.lifecycle, target);
    assert.throws(() => transitionPromise(context, closed, 2, 'active', ''), code('invalid'));
    const reopened = transitionPromise(context, closed, 2, 'active', 'New evidence').record;
    assert.equal(reopened.version, 3);
    assert.equal(reopened.revisions.length, 1);
    assert.throws(() => transitionPromise({ ...context, principal: { ...principal, workspaceId: 'other' } }, closed, 2, 'active', 'Wrong workspace'), code('not_found'));
  }
});
test('attention is independent of lifecycle and never invents an unknown hard deadline', () => {
  const record = create().record;
  const flags = { now: context.at, dueInstant: '2026-10-30T05:00:00Z', deadlineReviewed: true,
    dueSoonWindowMs: 86400000, possibleMismatch: true, openCase: true };
  assert.deepEqual(attention(record, flags), ['possible_mismatch', 'open_case']);
  const exact = { ...terms, deadline: { ...terms.deadline, precision: 'exact' as const, kind: 'instant' as const,
    date: flags.dueInstant, timezone: 'Asia/Kolkata' } };
  const changed = reviseTerms(context, record, 1, exact, 'Deadline confirmed').record;
  assert.deepEqual(attention(changed, flags), ['overdue', 'possible_mismatch', 'open_case']);
  assert.deepEqual(attention(changed, { ...flags, dueInstant: '2026-10-31T06:00:00Z' }), ['due_soon', 'possible_mismatch', 'open_case']);
  const fulfilled = transitionPromise(context, changed, 2, 'fulfilled', 'Paid').record;
  assert.deepEqual(attention(fulfilled, flags), []);
});
test('business-day exactness needs anchor, calendar and count semantics', () => {
  const incomplete = { ...terms, deadline: { ...terms.deadline, kind: 'business_days' as const, precision: 'exact' as const,
    date: '2026-11-02', timezone: 'Asia/Kolkata' } };
  assert.throws(() => createPromise(context, brand, { ...input, terms: incomplete }, sources), code('invalid'));
});
test('comparison decisions require current matching promise, reviewable state and a recorded reason', () => {
  const record = create().record;
  const comparison = { id: 'comparison-a', workspaceId: principal.workspaceId, promiseId: record.id,
    promiseVersion: 1, status: 'needs_review' as const };
  const result = decideComparison(context, record, comparison, 'confirmed_mismatch', 'Same plan and tax confirmed');
  assert.equal(result.decision?.actorId, principal.userId);
  assert.equal(comparison.status, 'needs_review');
  assert.throws(() => decideComparison(context, record, { ...comparison, promiseVersion: 2 }, 'dismissed', 'Changed terms'), code('conflict'));
  assert.throws(() => decideComparison(context, record, { ...comparison, status: 'insufficient_evidence' }, 'confirmed_mismatch', 'Missing bill'), code('invalid'));
});

test('candidate handler authorizes and resolves sources in the caller transaction; replay returns one result', async () => {
  let writes = 0; let authorization = 0;
  const results = new Map<string, { digest: string; result: Promise<unknown> }>();
  const transaction: PromiseTransaction = {
    async getBrand(p) { assert.equal(p.workspaceId, principal.workspaceId); return brand; },
    async getPromise() { return null; }, async getComparison() { return null; },
    async save(p, result, expectedVersion) {
      assert.equal(expectedVersion, null); assert.equal(result.event.workspaceId, p.workspaceId); writes++;
    },
    async idempotent<T>(p, key, digest, execute: () => Promise<T>): Promise<T> {
      const scopedKey = `${p.workspaceId}/${p.userId}/${key}`;
      const existing = results.get(scopedKey);
      if (existing) {
        if (existing.digest !== digest) throw new DomainError('conflict', 'Key payload changed');
        return existing.result as Promise<T>;
      }
      const result = Promise.resolve().then(execute);
      results.set(scopedKey, { digest, result }); return result;
    }
  };
  const handler = confirmationHandler({ access: { async authorize() { authorization++; } },
    evidence: { async resolve() { return sources; } }, context: p => ({ ...context, principal: p }) });
  const [first, second] = await Promise.all([
    handler.confirm(principal, transaction, input, brand.id, 'request-key', 'payload-1'),
    handler.confirm(principal, transaction, input, brand.id, 'request-key', 'payload-1')
  ]);
  assert.deepEqual(first, second); assert.equal(writes, 1); assert.equal(authorization, 2);
  await assert.rejects(handler.confirm(principal, transaction, input, brand.id, 'request-key', 'payload-2'), code('conflict'));
  const denied = confirmationHandler({ access: { async authorize() { throw new DomainError('not_found', 'Denied'); } },
    evidence: { async resolve() { throw new Error('Must not resolve before authorization'); } }, context: () => context });
  await assert.rejects(denied.confirm(principal, transaction, input, brand.id, 'denied', 'digest'), code('not_found'));
  assert.equal(writes, 1);
});
