/* global __ENV, __VU */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.TARGET_URL || '').replace(/\/+$/, '');
const SCENARIO = __ENV.SCENARIO || 'public';
const VUS = Number(__ENV.VUS || 50);
const DURATION = __ENV.DURATION || '60s';
const SHARD_INDEX = Number(__ENV.SHARD_INDEX || 0);
const LOADTEST_PASSWORD = __ENV.LOADTEST_PASSWORD || '';

if (!BASE_URL.startsWith('https://')) throw new Error('TARGET_URL must be an https URL');
if (SCENARIO === 'login' && !LOADTEST_PASSWORD) {
  throw new Error('SCENARIO=login requires LOADTEST_PASSWORD');
}

export const options = {
  scenarios: {
    burst: { executor: 'constant-vus', vus: VUS, duration: DURATION, gracefulStop: '15s' },
  },
  summaryTrendStats: ['med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:login}': ['p(95)<5000'],
    'http_req_duration{name:status}': ['p(95)<3000'],
    'http_req_duration{name:home}': ['p(95)<3000'],
  },
};

function loginOnce() {
  // Each VU owns one account so the per-NIM login limiter never sees parallel attempts.
  const accountNumber = SHARD_INDEX * VUS + __VU;
  const nim = `LOADTEST-${String(accountNumber).padStart(4, '0')}`;
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      nim,
      password: LOADTEST_PASSWORD,
      device_fingerprint: `loadtest-device-${accountNumber}`,
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' }, timeout: '20s' }
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  sleep(2 + Math.random() * 3);
}

function browsePublic() {
  const status = http.get(`${BASE_URL}/api/status`, { tags: { name: 'status' }, timeout: '20s' });
  check(status, { 'status 200': (r) => r.status === 200 });
  const home = http.get(`${BASE_URL}/api/public-site/home`, {
    tags: { name: 'home' },
    timeout: '20s',
  });
  check(home, { 'home 200': (r) => r.status === 200 });
  sleep(1 + Math.random() * 2);
}

export default function () {
  if (SCENARIO === 'login') loginOnce();
  else browsePublic();
}
