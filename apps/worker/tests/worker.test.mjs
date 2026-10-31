import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerRegistry } from '../dist/registry.js';
import { DurableJobQueue } from '@promise-keeper/runtime';

test('Worker registry executes registered job with dependency injection', async () => {
  const registry = new WorkerRegistry();
  const queue = new DurableJobQueue();

  registry.register({
    jobType: 'calculate_interest',
    schemaVersion: 1,
    priority: 'normal',
    handler: async (payload, ctx) => {
      assert.equal(ctx.principal.workspaceId, 'ws_fin');
      return { total: payload.amount * 2 };
    },
  });

  const job = queue.enqueue({
    workspaceId: 'ws_fin',
    jobType: 'calculate_interest',
    payload: { amount: 150 },
  });

  const leased = queue.acquireNextJob('worker_1');
  const res = await registry.executeJob(leased, { queue, workerId: 'worker_1' });

  assert.equal(res.success, true);
  assert.deepEqual(res.result, { total: 300 });

  const completed = queue.getJob(job.id);
  assert.equal(completed.status, 'succeeded');
});

test('Unknown job type terminates safely as dead letter failure', async () => {
  const registry = new WorkerRegistry();
  const queue = new DurableJobQueue();

  const job = queue.enqueue({
    workspaceId: 'ws_test',
    jobType: 'unknown_mystery_job',
    payload: {},
  });

  const leased = queue.acquireNextJob('worker_1');
  const res = await registry.executeJob(leased, { queue, workerId: 'worker_1' });

  assert.equal(res.success, false);
  assert.ok(res.error.includes('Unknown job type'));

  const failed = queue.getJob(job.id);
  assert.equal(failed.status, 'failed'); // Dead-lettered
});

test('Unsupported future schema version fails safely', async () => {
  const registry = new WorkerRegistry();
  const queue = new DurableJobQueue();

  registry.register({
    jobType: 'legacy_job',
    schemaVersion: 1,
    priority: 'normal',
  });

  const job = queue.enqueue({
    workspaceId: 'ws_test',
    jobType: 'legacy_job',
    schemaVersion: 99, // Future schema version
    payload: {},
  });

  const leased = queue.acquireNextJob('worker_1');
  const res = await registry.executeJob(leased, { queue, workerId: 'worker_1' });

  assert.equal(res.success, false);
  assert.ok(res.error.includes('Unsupported job schema version'));

  const failed = queue.getJob(job.id);
  assert.equal(failed.status, 'failed');
});
