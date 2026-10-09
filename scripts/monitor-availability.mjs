import process from 'node:process';
import { pathToFileURL } from 'node:url';

export async function probeAvailability({ appUrl, token, fetchImpl = fetch }) {
  const target = new URL('/api/health', appUrl);
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw new Error('Monitoring requires HTTPS outside localhost');
  }
  const started = performance.now();
  try {
    const response = await fetchImpl(target, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const challenged = response.headers.get('x-vercel-mitigated') === 'challenge';
    const body = await response.json().catch(() => null);
    const durationMs = Math.round(performance.now() - started);
    const metrics = body?.metrics;
    const elevatedErrors = metrics?.requests >= 20 && metrics?.error_rate >= 0.01;
    const elevatedLatency = metrics?.requests >= 20 && metrics?.slow_rate >= 0.2;
    return {
      ok: response.ok && body?.success === true && durationMs < 5000 && !elevatedErrors && !elevatedLatency,
      status: response.status,
      duration_ms: durationMs,
      reason: challenged ? 'firewall_challenge' : !response.ok || body?.success !== true
        ? 'readiness_failed' : elevatedErrors ? 'error_rate' : elevatedLatency || durationMs >= 5000
          ? 'latency' : 'healthy',
      checked_at: new Date().toISOString(),
    };
  } catch {
    return { ok: false, status: 0, duration_ms: Math.round(performance.now() - started),
      reason: 'network_or_timeout', checked_at: new Date().toISOString() };
  }
}

async function main() {
  const { APP_URL, CRON_SECRET, ALERT_WEBHOOK_URL } = process.env;
  if (!APP_URL || !CRON_SECRET) throw new Error('APP_URL and CRON_SECRET are required');
  const result = await probeAvailability({ appUrl: APP_URL, token: CRON_SECRET });
  console.log(JSON.stringify({ type: 'availability_probe', ...result }));
  if (!result.ok) {
    if (ALERT_WEBHOOK_URL) {
      const webhook = new URL(ALERT_WEBHOOK_URL);
      if (webhook.protocol !== 'https:') throw new Error('Alert webhook requires HTTPS');
      const sent = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `HMSDP availability alert: ${new URL(APP_URL).hostname}; ${result.reason}; HTTP ${result.status}; ${result.duration_ms}ms; ${result.checked_at}`,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
      if (!sent.ok) console.error(`Alert delivery failed: HTTP ${sent.status}`);
    } else {
      console.error('ALERT_WEBHOOK_URL is not configured; enable workflow failure notifications.');
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('Availability monitor failed; verify configuration and notification delivery.');
    process.exitCode = 1;
  });
}
