import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MigrationRunner,
  ScopedRepository,
  withTransaction,
  VersionConflictError,
  CrossTenantAccessError,
} from '../dist/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../migrations');

test('MigrationRunner migrates initial schema from zero', async () => {
  const runner = new MigrationRunner(migrationsDir);
  const result = await runner.migrate();
  assert.equal(result.appliedCount, 1);
  assert.equal(result.migrations[0], '0001_initial_schema.sql');

  const applied = runner.getApplied();
  assert.equal(applied.length, 1);
  assert.equal(applied[0].name, '0001_initial_schema.sql');
  assert.ok(applied[0].checksum.length > 0);

  // Subsequent run should detect no new migrations
  const reRun = await runner.migrate();
  assert.equal(reRun.appliedCount, 0);
});

test('ScopedRepository enforces strict tenant isolation', async () => {
  const repoA = new ScopedRepository('ws_tenant_a', 'test_entity');
  const repoB = new ScopedRepository('ws_tenant_b', 'test_entity');

  const itemA = await repoA.insert({
    id: 'entity_1',
    name: 'Secret Promise of Tenant A',
  });

  assert.equal(itemA.workspaceId, 'ws_tenant_a');

  // Tenant A sees item
  const foundByA = await repoA.findById('entity_1');
  assert.ok(foundByA);
  assert.equal(foundByA.name, 'Secret Promise of Tenant A');

  // Tenant B cannot see Tenant A item
  const foundByB = await repoB.findById('entity_1');
  assert.equal(foundByB, null);

  const listB = await repoB.findMany();
  assert.equal(listB.length, 0);

  // Cross-tenant insert attempt fails
  await assert.rejects(
    () => repoA.insert({ id: 'bad_item', workspaceId: 'ws_tenant_b' }),
    CrossTenantAccessError,
  );
});

test('ScopedRepository detects version conflict on concurrent update', async () => {
  const repo = new ScopedRepository('ws_tenant_a', 'promise');
  const created = await repo.insert({ id: 'prm_1', title: 'Price Lock' });
  assert.equal(created.version, 1);

  // First update succeeds with version 1 -> 2
  const updated = await repo.update('prm_1', { title: 'Price Lock v2' }, 1);
  assert.equal(updated.version, 2);

  // Second update with stale version 1 fails
  await assert.rejects(
    () => repo.update('prm_1', { title: 'Price Lock Stale' }, 1),
    VersionConflictError,
  );
});

test('withTransaction rolls back domain changes and outbox on error', async () => {
  const ws = 'ws_transaction_test';
  let insertedId = null;

  await assert.rejects(
    withTransaction(ws, async (uow) => {
      const outboxEntry = await uow.outbox.insert({
        id: 'outbox_1',
        eventId: 'evt_1',
        eventType: 'promise.created.v1',
        aggregateId: 'prm_100',
        aggregateVersion: 1,
        payload: { title: 'Failing Transaction' },
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      insertedId = outboxEntry.id;
      uow.registerRollback(() => {
        void uow.outbox.delete(outboxEntry.id);
      });

      // Simulate unexpected domain error
      throw new Error('Database constraint failure simulation');
    }),
    /Database constraint failure/,
  );

  // Outbox entry should have been rolled back
  const checkRepo = new ScopedRepository(ws, 'outbox');
  const found = await checkRepo.findById(insertedId);
  assert.equal(found, null);
});
