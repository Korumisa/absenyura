/* global __ENV, __VU, open */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.TARGET_URL || '').replace(/\/+$/, '');
const SCENARIO = __ENV.SCENARIO || 'public';
const VUS = Number(__ENV.VUS || 50);
const DURATION = __ENV.DURATION || '60s';
const SHARD_INDEX = Number(__ENV.SHARD_INDEX || 0);
const LOADTEST_PASSWORD = __ENV.LOADTEST_PASSWORD || '';
const SESSION_ID = __ENV.SESSION_ID || '';
const QR_TOKEN = __ENV.QR_TOKEN || '';
const START_AT = Number(__ENV.START_AT || 0);
// Must match the geofenced LOADTEST location the session is attached to.
const CHECKIN_LAT = Number(__ENV.CHECKIN_LAT || -6.2);
const CHECKIN_LNG = Number(__ENV.CHECKIN_LNG || 106.816666);
const LOGIN_WINDOW_SEC = 45;
const CHECKIN_DELAY_SEC = 60;

if (!BASE_URL.startsWith('https://')) throw new Error('TARGET_URL must be an https URL');
if ((SCENARIO === 'login' || SCENARIO === 'checkin') && !LOADTEST_PASSWORD) {
  throw new Error(`SCENARIO=${SCENARIO} requires LOADTEST_PASSWORD`);
}
if (SCENARIO === 'checkin' && (!SESSION_ID || !QR_TOKEN || !START_AT)) {
  throw new Error('SCENARIO=checkin requires SESSION_ID, QR_TOKEN and START_AT');
}

const PHOTO = SCENARIO === 'checkin' ? open('./fixtures/checkin-photo.jpg', 'b') : null;

function durationSeconds(value) {
  const match = /^(\d+)(s|m)$/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * (match[2] === 'm' ? 60 : 1);
}

export const options = {
  scenarios:
    SCENARIO === 'checkin'
      ? {
          // Each account can check in once per session, so every VU runs the flow exactly once.
          checkin: {
            executor: 'per-vu-iterations',
            vus: VUS,
            iterations: 1,
            maxDuration: '10m',
            gracefulStop: '30s',
          },
        }
      : { burst: { executor: 'constant-vus', vus: VUS, duration: DURATION, gracefulStop: '15s' } },
  summaryTrendStats: ['med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:login}': ['p(95)<5000'],
    'http_req_duration{name:status}': ['p(95)<3000'],
    'http_req_duration{name:home}': ['p(95)<3000'],
    'http_req_duration{name:verify_qr}': ['p(95)<3000'],
    'http_req_duration{name:challenge}': ['p(95)<3000'],
    'http_req_duration{name:checkin}': ['p(95)<5000'],
  },
};

// Each VU owns one account so the per-NIM login limiter never sees parallel attempts.
const accountNumber = () => SHARD_INDEX * VUS + __VU;
const deviceFingerprint = (n) => `loadtest-device-${n}`;

function login(n) {
  return http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      nim: `LOADTEST-${String(n).padStart(4, '0')}`,
      password: LOADTEST_PASSWORD,
      device_fingerprint: deviceFingerprint(n),
    }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' }, timeout: '20s' }
  );
}

function loginOnce() {
  check(login(accountNumber()), { 'login 200': (r) => r.status === 200 });
  sleep(2 + Math.random() * 3);
}

function sleepUntil(epochSeconds) {
  const remaining = epochSeconds - Date.now() / 1000;
  if (remaining > 0) sleep(remaining);
}

function checkInOnce() {
  const n = accountNumber();
  sleep(Math.random() * LOGIN_WINDOW_SEC);
  const loginRes = login(n);
  const csrfToken = loginRes.cookies.csrfToken?.[0]?.value;
  if (!check(loginRes, { 'login 200': (r) => r.status === 200 && Boolean(csrfToken) })) return;

  sleepUntil(START_AT + CHECKIN_DELAY_SEC + Math.random() * durationSeconds(DURATION));

  const verify = http.post(
    `${BASE_URL}/api/attendance/verify-qr`,
    JSON.stringify({ session_id: SESSION_ID, qr_token: QR_TOKEN, action: 'checkin' }),
    {
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      tags: { name: 'verify_qr' },
      timeout: '30s',
    }
  );
  if (!check(verify, { 'verify-qr 200': (r) => r.status === 200 })) return;

  const accuracy = '12';
  const query = [
    'action=checkin',
    `session_id=${encodeURIComponent(SESSION_ID)}`,
    `latitude=${CHECKIN_LAT}`,
    `longitude=${CHECKIN_LNG}`,
    `accuracy=${accuracy}`,
    `photo_size=${PHOTO.byteLength}`,
    'photo_type=image%2Fjpeg',
  ].join('&');
  const challenge = http.get(`${BASE_URL}/api/attendance/challenge?${query}`, {
    tags: { name: 'challenge' },
    timeout: '30s',
  });
  const proof = challenge.status === 200 ? challenge.json('data') : null;
  if (!check(challenge, { 'challenge 200': () => Boolean(proof?.nonce && proof?.signature) }))
    return;

  const checkin = http.post(
    `${BASE_URL}/api/attendance/check-in`,
    {
      session_id: SESSION_ID,
      qr_token: QR_TOKEN,
      latitude: String(CHECKIN_LAT),
      longitude: String(CHECKIN_LNG),
      accuracy,
      ip_address: '',
      device_fingerprint: deviceFingerprint(n),
      nonce: proof.nonce,
      signature: proof.signature,
      photo_size: String(PHOTO.byteLength),
      photo_type: 'image/jpeg',
      photo: http.file(PHOTO, 'attendance.jpg', 'image/jpeg'),
    },
    {
      headers: {
        'X-CSRF-Token': csrfToken,
        'X-Idempotency-Key': `loadtest-${n}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      },
      tags: { name: 'checkin' },
      timeout: '30s',
    }
  );
  check(checkin, { 'check-in 201': (r) => r.status === 201 });
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
  if (SCENARIO === 'checkin') checkInOnce();
  else if (SCENARIO === 'login') loginOnce();
  else browsePublic();
}
