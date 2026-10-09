import type { Request, Response, NextFunction } from 'express';
import { performance } from 'node:perf_hooks';

const buckets = new Map<
  number,
  { requests: number; errors: number; slow: number; bytes: number }
>();
let cpu = process.cpuUsage();
let sampledAt = performance.now();
let loop = performance.eventLoopUtilization();
let lastAlertAt = 0;

export function getRuntimeMetrics() {
  const cutoff = Math.floor(Date.now() / 60_000) - 4;
  for (const minute of buckets.keys()) if (minute < cutoff) buckets.delete(minute);
  const totals = [...buckets.values()].reduce(
    (sum, bucket) => ({
      requests: sum.requests + bucket.requests,
      errors: sum.errors + bucket.errors,
      slow: sum.slow + bucket.slow,
      bytes: sum.bytes + bucket.bytes,
    }),
    { requests: 0, errors: 0, slow: 0, bytes: 0 }
  );
  return {
    scope: 'instance',
    window_seconds: 300,
    ...totals,
    error_rate: totals.requests ? totals.errors / totals.requests : 0,
    slow_rate: totals.requests ? totals.slow / totals.requests : 0,
    memory: process.memoryUsage(),
    uptime_seconds: Math.round(process.uptime()),
  };
}

/** Structured request events and bounded process metrics, without tokens, query strings or bodies. */
export function requestTiming(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  const routeGroup = '/' + req.path.split('/').filter(Boolean).slice(0, 2).join('/');
  let recorded = false;

  const record = (aborted: boolean) => {
    if (recorded) return;
    recorded = true;
    const ms = Math.round(performance.now() - start);
    const minute = Math.floor(Date.now() / 60_000);
    const bucket = buckets.get(minute) ?? { requests: 0, errors: 0, slow: 0, bytes: 0 };
    bucket.requests++;
    if (aborted || res.statusCode >= 500) bucket.errors++;
    if (ms > 5_000) bucket.slow++;
    bucket.bytes += Number(res.getHeader('content-length')) || 0;
    buckets.set(minute, bucket);
    const metrics = getRuntimeMetrics();
    console.info(
      JSON.stringify({
        type: 'http_request',
        method: req.method,
        route_group: routeGroup,
        status: res.statusCode,
        aborted,
        duration_ms: ms,
        trace_id: res.getHeader('X-Request-ID'),
        response_bytes: Number(res.getHeader('content-length')) || 0,
      })
    );
    const elapsed = performance.now() - sampledAt;
    if (elapsed >= 30_000) {
      const usage = process.cpuUsage(cpu);
      const utilization = performance.eventLoopUtilization(loop);
      console.info(
        JSON.stringify({
          type: 'runtime_metrics',
          ...metrics,
          process_cpu_percent: ((usage.user + usage.system) / (elapsed * 1000)) * 100,
          event_loop_utilization: utilization.utilization,
        })
      );
      cpu = process.cpuUsage();
      sampledAt = performance.now();
      loop = performance.eventLoopUtilization();
    }
    if (
      metrics.requests >= 20 &&
      (metrics.error_rate >= 0.01 || metrics.slow_rate >= 0.2) &&
      Date.now() - lastAlertAt >= 60_000
    ) {
      lastAlertAt = Date.now();
      console.error(JSON.stringify({ type: 'availability_alert', ...metrics }));
    }
  };
  res.once('finish', () => record(false));
  res.once('close', () => record(!res.writableFinished));

  next();
}
