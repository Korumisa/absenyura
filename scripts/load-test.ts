import { pathToFileURL } from 'node:url';

export async function runLoadTest(url: string, concurrency = 50, requests = 500) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol))
    throw new Error('Only HTTP targets are supported');
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) &&
    process.env.ALLOW_REMOTE_LOAD_TEST !== 'I_HAVE_APPROVAL'
  ) {
    throw new Error(
      'Remote load tests require explicit approval via ALLOW_REMOTE_LOAD_TEST=I_HAVE_APPROVAL'
    );
  }
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 200 ||
    !Number.isInteger(requests) ||
    requests < 1 ||
    requests > 10_000
  ) {
    throw new Error('Use concurrency 1..200 and requests 1..10000');
  }
  let issued = 0;
  let failures = 0;
  const statuses: Record<string, number> = {};
  const durations: number[] = [];
  const started = performance.now();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, requests) }, async () => {
      while (issued < requests) {
        issued++;
        const at = performance.now();
        try {
          const response = await fetch(target, {
            signal: AbortSignal.timeout(10_000),
            redirect: 'error',
          });
          statuses[response.status] = (statuses[response.status] ?? 0) + 1;
          const body = await response.json().catch(() => null);
          if (!response.ok || !body || body.success === false) failures++;
        } catch {
          failures++;
          statuses.network_error = (statuses.network_error ?? 0) + 1;
        }
        durations.push(performance.now() - at);
      }
    })
  );
  durations.sort((a, b) => a - b);
  const percentile = (p: number) => Math.round(durations[Math.ceil(durations.length * p) - 1]);
  return {
    requests,
    concurrency,
    failures,
    statuses,
    error_rate: failures / requests,
    p50_ms: percentile(0.5),
    p95_ms: percentile(0.95),
    p99_ms: percentile(0.99),
    max_ms: Math.round(durations[durations.length - 1]),
    total_ms: Math.round(performance.now() - started),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.LOAD_TEST_URL;
  if (!url) throw new Error('Set LOAD_TEST_URL to an isolated test endpoint');
  const result = await runLoadTest(
    url,
    Number(process.env.LOAD_CONCURRENCY ?? 50),
    Number(process.env.LOAD_REQUESTS ?? 500)
  );
  console.log(JSON.stringify(result, null, 2));
  if (result.error_rate > 0.001 || result.p95_ms > 2000) process.exitCode = 1;
}
