import test from 'node:test';
import assert from 'node:assert/strict';
import { probeAvailability } from './monitor-availability.mjs';

const probe = (fetchImpl) => probeAvailability({ appUrl: 'https://example.test', token: 'test', fetchImpl });

test('healthy JSON passes and internal authentication is sent without redirect following', async () => {
  const result = await probe(async (url, options) => {
    assert.equal(url.pathname, '/api/health');
    assert.equal(options.headers.Authorization, 'Bearer test');
    assert.equal(options.redirect, 'error');
    return Response.json({ success: true, metrics: { requests: 100, error_rate: 0, slow_rate: 0 } });
  });
  assert.equal(result.ok, true);
});

test('HTML firewall challenge is not mistaken for healthy service', async () => {
  const result = await probe(async () => new Response('<html>challenge</html>', {
    status: 429, headers: { 'x-vercel-mitigated': 'challenge' },
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'firewall_challenge');
});

test('database errors and invalid success bodies fail monitoring', async () => {
  for (const response of [
    Response.json({ success: false }, { status: 503 }),
    new Response('<html>login</html>'),
  ]) {
    assert.equal((await probe(async () => response)).ok, false);
  }
});

test('elevated rolling errors trigger an alert even when health returns 200', async () => {
  const result = await probe(async () => Response.json({
    success: true, metrics: { requests: 100, error_rate: 0.02, slow_rate: 0 },
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'error_rate');
});

test('network failures produce a machine-readable failure without leaking credentials', async () => {
  const result = await probe(async () => { throw new Error('private connection detail'); });
  assert.equal(result.reason, 'network_or_timeout');
  assert.doesNotMatch(JSON.stringify(result), /private connection detail/);
});
