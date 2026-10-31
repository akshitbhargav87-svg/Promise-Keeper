import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMoney,
  formatMoney,
  addMoney,
  subtractMoney,
  compareMoney,
  MoneySchema,
  PrincipalSchema,
  SourceRefSchema,
  ApiErrorSchema,
  JobRefSchema,
  DomainEventSchema,
  FeatureRegistry,
  OPENAPI_SPEC,
} from '../src/index.js';

test('Money arithmetic and formatting with INR and USD', () => {
  const m1 = parseMoney('19900', 'INR');
  const m2 = parseMoney('15000', 'INR');
  const sum = addMoney(m1, m2);
  assert.equal(sum.minor, '34900');
  assert.equal(sum.currency, 'INR');

  const diff = subtractMoney(sum, m1);
  assert.equal(diff.minor, '15000');

  assert.equal(compareMoney(sum, m1), 1);
  assert.equal(compareMoney(m1, sum), -1);
  assert.equal(compareMoney(m1, m1), 0);

  assert.equal(formatMoney(m1), 'INR 199.00');
  assert.equal(formatMoney(parseMoney('-5000', 'INR')), '-INR 50.00');
  assert.equal(formatMoney(parseMoney('1000', 'JPY')), 'JPY 1000');
  assert.equal(formatMoney(parseMoney('1250', 'KWD')), 'KWD 1.250');
});

test('Money rejects mismatched currencies during arithmetic', () => {
  const inr = parseMoney('100', 'INR');
  const usd = parseMoney('100', 'USD');
  assert.throws(() => addMoney(inr, usd), /Cannot add different currencies/);
  assert.throws(() => subtractMoney(inr, usd), /Cannot subtract different currencies/);
  assert.throws(() => compareMoney(inr, usd), /Cannot compare different currencies/);
});

test('Principal schema validates server-generated session context', () => {
  const valid = {
    userId: 'u_123',
    workspaceId: 'ws_456',
    roles: ['owner'],
    sessionId: 'sess_789',
  };
  assert.deepEqual(PrincipalSchema.parse(valid), valid);

  assert.throws(() => PrincipalSchema.parse({ userId: '' }));
});

test('SourceRef preserves version, span, and evidence semantics', () => {
  const ref = {
    evidenceId: 'ev_001',
    assetVersion: 1,
    spanId: 'span_001',
  };
  assert.deepEqual(SourceRefSchema.parse(ref), ref);
});

test('Domain event envelope validates structure and ISO datetime', () => {
  const event = {
    eventId: 'evt_001',
    eventType: 'promise.changed.v1',
    schemaVersion: 1,
    workspaceId: 'ws_1',
    aggregateId: 'prm_1',
    aggregateVersion: 2,
    occurredAt: '2026-10-31T05:00:00.000Z',
    recordedAt: '2026-10-31T05:00:01.000Z',
    correlationId: 'req_1',
    payload: { title: 'Updated Terms' },
  };
  assert.deepEqual(DomainEventSchema.parse(event), event);
});

test('Feature registry allows decoupled registration without shared file edits', () => {
  const registry = FeatureRegistry.getInstance();
  registry.registerRoutes({
    featureId: 'promises',
    routes: [
      {
        path: '/promises',
        method: 'GET',
        summary: 'List promises',
        authRequired: true,
      },
    ],
  });

  const routes = registry.getAllRoutes();
  assert.ok(routes.some((r) => r.featureId === 'promises'));

  assert.throws(() => {
    registry.registerRoutes({
      featureId: 'promises',
      routes: [],
    });
  }, /Duplicate route registration/);
});

test('OpenAPI specification includes core schemas and paths', () => {
  assert.equal(OPENAPI_SPEC.openapi, '3.1.0');
  assert.ok(OPENAPI_SPEC.paths['/health/live']);
  assert.ok(OPENAPI_SPEC.paths['/promises']);
  assert.ok(OPENAPI_SPEC.components.schemas.Money);
  assert.ok(OPENAPI_SPEC.components.schemas.Principal);
});
