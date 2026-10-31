import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv, SanitizedEnvError } from '../dist/config/env.js';

test('validates default synthetic environment for development', () => {
  const env = validateEnv({}, 'development');
  assert.equal(env.NODE_ENV, 'development');
  assert.equal(env.PORT, 3000);
  assert.equal(env.PROCESSING_MODE, 'synthetic');
  assert.ok(env.DATABASE_URL.includes('promise_keeper_dev'));
  assert.ok(env.SESSION_SECRET.length >= 32);
});

test('fails on production profile when production secrets are missing', () => {
  assert.throws(
    () => {
      validateEnv({ NODE_ENV: 'production' }, 'production');
    },
    (err) => {
      assert.ok(err instanceof SanitizedEnvError);
      const keys = err.fieldErrors.map((e) => e.key);
      assert.ok(keys.includes('SESSION_SECRET') || keys.includes('DATABASE_URL'));
      // Ensure no raw secrets leaked in message
      assert.ok(!err.message.includes('gho_'));
      return true;
    },
  );
});

test('fails on invalid port number with actionable error', () => {
  assert.throws(
    () => {
      validateEnv({ PORT: '999999' }, 'development');
    },
    (err) => {
      assert.ok(err instanceof SanitizedEnvError);
      assert.ok(err.fieldErrors.some((e) => e.key === 'PORT'));
      return true;
    },
  );
});
