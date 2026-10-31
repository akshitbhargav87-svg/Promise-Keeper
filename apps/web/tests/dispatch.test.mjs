import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppHttpError,
  mapErrorToResponse,
  enforceProductionProviderRules,
} from '../src/server/dispatch.ts';

test('mapErrorToResponse maps AppHttpError to standard API format', () => {
  const err = new AppHttpError(403, 'INSUFFICIENT_PERMISSIONS', 'Permission denied');
  const res = mapErrorToResponse(err, 'req_123');

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, 'INSUFFICIENT_PERMISSIONS');
  assert.equal(res.body.error.requestId, 'req_123');
  assert.equal(res.body.error.retryable, false);
});

test('mapErrorToResponse maps cross tenant access error to 404 to avoid leakage', () => {
  const crossErr = new Error('Cross-tenant');
  crossErr.name = 'CrossTenantAccessError';
  const res = mapErrorToResponse(crossErr, 'req_404');

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error.code, 'RESOURCE_NOT_FOUND');
});

test('enforceProductionProviderRules strictly rejects mocks in production profile', () => {
  const prodEnv = {
    NODE_ENV: 'production',
  };

  assert.throws(
    () => enforceProductionProviderRules(prodEnv, 'MockGmailProvider', true),
    (err) => {
      assert.ok(err instanceof AppHttpError);
      assert.equal(err.statusCode, 503);
      assert.equal(err.code, 'MOCK_PROVIDER_PROHIBITED_IN_PRODUCTION');
      return true;
    },
  );

  // In development, mocks are permitted
  const devEnv = {
    NODE_ENV: 'development',
  };
  assert.doesNotThrow(() =>
    enforceProductionProviderRules(devEnv, 'MockGmailProvider', true),
  );
});
