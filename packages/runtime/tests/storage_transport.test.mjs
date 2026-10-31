import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  LocalStorageAdapter,
  StorageGrantError,
  IntegrityMismatchError,
  SSEStreamBuffer,
  JobStatusService,
  DurableJobQueue,
} from '../dist/index.js';

test('Unauthorized request without workspaceId never receives grant', async () => {
  const storage = new LocalStorageAdapter();
  await assert.rejects(
    () => storage.createUploadGrant('', 'bill.pdf', 'application/pdf'),
    StorageGrantError,
  );
});

test('Finalization validates file size limit and fails if oversized', async () => {
  const storage = new LocalStorageAdapter();
  const grant = await storage.createUploadGrant(
    'ws_1',
    'receipt.png',
    'image/png',
    100, // 100 bytes max
  );

  const oversizedBuffer = Buffer.alloc(150, 0xaa);
  await assert.rejects(
    () => storage.finalizeUpload('ws_1', grant.grantToken, oversizedBuffer),
    /exceeds maximum granted size/,
  );
});

test('Finalization rejects mismatched SHA-256 hash', async () => {
  const storage = new LocalStorageAdapter();
  const grant = await storage.createUploadGrant('ws_1', 'doc.pdf', 'application/pdf');

  const content = Buffer.from('Official brand promise terms');
  const wrongSha = '0000000000000000000000000000000000000000000000000000000000000000';

  await assert.rejects(
    () => storage.finalizeUpload('ws_1', grant.grantToken, content, wrongSha),
    IntegrityMismatchError,
  );
});

test('Finalization succeeds with verified integrity and triggers lifecycle hooks', async () => {
  const storage = new LocalStorageAdapter();
  let hookCalled = false;

  storage.onFinalized(async (asset) => {
    hookCalled = true;
    assert.equal(asset.workspaceId, 'ws_1');
  });

  const grant = await storage.createUploadGrant('ws_1', 'valid.pdf', 'application/pdf');
  const buffer = Buffer.from('Valid content');
  const sha = crypto.createHash('sha256').update(buffer).digest('hex');

  const asset = await storage.finalizeUpload('ws_1', grant.grantToken, buffer, sha);
  assert.equal(asset.sha256, sha);
  assert.equal(asset.sizeBytes, buffer.length);
  assert.ok(hookCalled);

  // Subsequent download grant succeeds for owning workspace
  const dl = await storage.createDownloadGrant('ws_1', asset.storageKey);
  assert.ok(dl.downloadUrl.includes(asset.storageKey));

  // Other workspace cannot obtain download grant
  await assert.rejects(
    () => storage.createDownloadGrant('ws_other', asset.storageKey),
    StorageGrantError,
  );
});

test('JobStatusService enforces strict tenant scoping', () => {
  const queue = new DurableJobQueue();
  const job = queue.enqueue({
    workspaceId: 'ws_tenant_1',
    jobType: 'parse_evidence',
    payload: { id: 1 },
  });

  const statusService = new JobStatusService(queue);

  // Owning tenant sees status
  const status1 = statusService.getJobStatus('ws_tenant_1', job.id);
  assert.ok(status1);
  assert.equal(status1.jobId, job.id);
  assert.equal(status1.status, 'queued');

  // Other tenant receives null (no existence leak)
  const status2 = statusService.getJobStatus('ws_tenant_2', job.id);
  assert.equal(status2, null);
});

test('SSEStreamBuffer supports resumption and sanitizes secret credentials', () => {
  const stream = new SSEStreamBuffer();

  stream.emit('message.started', { threadId: 'th_1' });
  stream.emit('text.delta', { delta: 'Your bill has arrived' });
  stream.emit('auth.diagnostic', {
    status: 'ok',
    sessionToken: 'secret_12345',
    apiKey: 'key_xyz987',
  });

  const all = stream.getAllEvents();
  assert.equal(all.length, 3);
  assert.equal(all[0].id, 1);
  assert.equal(all[1].id, 2);
  assert.equal(all[2].id, 3);

  // Verify secret redaction
  const diagnosticData = all[2].data;
  assert.equal(diagnosticData.sessionToken, '[REDACTED]');
  assert.equal(diagnosticData.apiKey, '[REDACTED]');

  // Verify resumption after event ID 1
  const resumed = stream.getEventsSince(1);
  assert.equal(resumed.length, 2);
  assert.equal(resumed[0].id, 2);
  assert.equal(resumed[1].id, 3);
});
