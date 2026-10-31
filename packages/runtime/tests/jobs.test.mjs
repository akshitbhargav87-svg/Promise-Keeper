import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DurableJobQueue,
  FrozenClock,
  OutboxDispatcher,
} from '../dist/index.js';

test('Two workers cannot commit conflicting job results', () => {
  const clock = new FrozenClock();
  const queue = new DurableJobQueue(clock);

  const job = queue.enqueue({
    workspaceId: 'ws_1',
    jobType: 'extract_evidence',
    payload: { fileId: 'f_100' },
  });

  // Worker 1 acquires the job
  const acquired1 = queue.acquireNextJob('worker_1', 10000);
  assert.ok(acquired1);
  assert.equal(acquired1.id, job.id);
  assert.equal(acquired1.leaseOwner, 'worker_1');

  // Worker 2 attempts to acquire; none available
  const acquired2 = queue.acquireNextJob('worker_2', 10000);
  assert.equal(acquired2, null);

  // Worker 2 cannot complete or commit results for Worker 1's lease
  const invalidCommit = queue.completeJob(job.id, 'worker_2', { success: false });
  assert.equal(invalidCommit, false);

  // Worker 1 completes the job successfully
  const validCommit = queue.completeJob(job.id, 'worker_1', { success: true });
  assert.equal(validCommit, true);

  const finalJob = queue.getJob(job.id);
  assert.equal(finalJob.status, 'succeeded');
  assert.deepEqual(finalJob.result, { success: true });
});

test('Expired lease is recoverable by another worker', () => {
  const clock = new FrozenClock();
  const queue = new DurableJobQueue(clock);

  const job = queue.enqueue({
    workspaceId: 'ws_1',
    jobType: 'sync_mail',
    payload: { folder: 'inbox' },
  });

  // Worker 1 acquires lease for 5 seconds
  const leased1 = queue.acquireNextJob('worker_1', 5000);
  assert.ok(leased1);
  assert.equal(leased1.attempt, 1);

  // Advance clock by 6 seconds (lease expires)
  clock.advance(6000);

  // Worker 2 acquires the expired lease
  const leased2 = queue.acquireNextJob('worker_2', 5000);
  assert.ok(leased2);
  assert.equal(leased2.id, job.id);
  assert.equal(leased2.leaseOwner, 'worker_2');
  assert.equal(leased2.attempt, 2);
});

test('Poison job terminates visibly into dead letter failure', () => {
  const clock = new FrozenClock();
  const queue = new DurableJobQueue(clock);

  const job = queue.enqueue({
    workspaceId: 'ws_1',
    jobType: 'parse_corrupted',
    maxAttempts: 2,
    payload: {},
  });

  // Attempt 1 fails
  const attempt1 = queue.acquireNextJob('worker_1', 5000);
  queue.failJob(job.id, 'worker_1', 'Corrupted header', true);
  assert.equal(queue.getJob(job.id).status, 'queued');

  // Advance clock past backoff
  clock.advance(5000);

  // Attempt 2 fails -> exceeds maxAttempts -> Dead letter
  const attempt2 = queue.acquireNextJob('worker_1', 5000);
  queue.failJob(job.id, 'worker_1', 'Corrupted header again', true);

  const finalJob = queue.getJob(job.id);
  assert.equal(finalJob.status, 'failed');
  assert.equal(finalJob.error, 'Corrupted header again');

  const health = queue.getHealth();
  assert.equal(health.failedDeadLetter, 1);
});

test('High priority reminder jobs processed before bulk normal/low imports', () => {
  const clock = new FrozenClock();
  const queue = new DurableJobQueue(clock);

  // Enqueue 3 bulk low-priority jobs
  queue.enqueue({
    workspaceId: 'ws_1',
    jobType: 'bulk_import',
    priority: 'low',
    payload: { id: 1 },
  });
  queue.enqueue({
    workspaceId: 'ws_1',
    jobType: 'bulk_import',
    priority: 'normal',
    payload: { id: 2 },
  });

  // Now enqueue high priority reminder
  const reminderJob = queue.enqueue({
    workspaceId: 'ws_1',
    jobType: 'send_reminder',
    priority: 'high',
    payload: { reminderId: 'rem_urgent' },
  });

  // Next job acquired must be the high priority reminder
  const nextJob = queue.acquireNextJob('worker_1', 5000);
  assert.equal(nextJob.id, reminderJob.id);
  assert.equal(nextJob.priority, 'high');
});

test('Outbox dispatcher prevents duplicate processing across consumers', async () => {
  const dispatcher = new OutboxDispatcher();
  let processCount = 0;

  dispatcher.registerConsumer('timeline_consumer', async (msg) => {
    processCount++;
  });

  const msg = {
    id: 'outbox_1',
    workspaceId: 'ws_1',
    eventId: 'evt_100',
    eventType: 'promise.created.v1',
    aggregateId: 'prm_1',
    aggregateVersion: 1,
    payload: {},
    createdAt: new Date(),
  };

  // First dispatch: processed
  const res1 = await dispatcher.dispatch(msg);
  assert.equal(res1.dispatched, 1);
  assert.equal(res1.skipped, 0);
  assert.equal(processCount, 1);

  // Replay of same eventId: skipped
  const res2 = await dispatcher.dispatch(msg);
  assert.equal(res2.dispatched, 0);
  assert.equal(res2.skipped, 1);
  assert.equal(processCount, 1);
});
