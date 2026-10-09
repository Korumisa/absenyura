import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'summaries';
const files = readdirSync(dir, { recursive: true })
  .map(String)
  .filter((file) => file.endsWith('.json'));

if (files.length === 0) {
  console.error(`No k6 summary files found in ${dir}`);
  process.exit(1);
}

let totalRequests = 0;
let failedRequests = 0;
const worstByEndpoint = new Map();

for (const file of files) {
  const { metrics } = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const count = metrics.http_reqs?.count ?? 0;
  totalRequests += count;
  failedRequests += Math.round((metrics.http_req_failed?.value ?? 0) * count);

  for (const [name, values] of Object.entries(metrics)) {
    const match = /^http_req_duration\{name:(.+)\}$/.exec(name);
    if (!match) continue;
    const previous = worstByEndpoint.get(match[1]) ?? {};
    worstByEndpoint.set(match[1], {
      med: Math.max(previous.med ?? 0, values.med ?? 0),
      p95: Math.max(previous.p95 ?? 0, values['p(95)'] ?? 0),
      p99: Math.max(previous.p99 ?? 0, values['p(99)'] ?? 0),
      max: Math.max(previous.max ?? 0, values.max ?? 0),
    });
  }
}

const ms = (value) => `${Math.round(value)} ms`;
const errorRate = totalRequests ? (failedRequests / totalRequests) * 100 : 0;
const lines = [
  '## k6 load test summary',
  '',
  `Runners: ${files.length} · Requests: ${totalRequests} · Failed: ${failedRequests} (${errorRate.toFixed(2)}%)`,
  '',
  '| Endpoint | median (worst runner) | p95 | p99 | max |',
  '|---|---|---|---|---|',
  ...[...worstByEndpoint].map(
    ([name, v]) => `| ${name} | ${ms(v.med)} | ${ms(v.p95)} | ${ms(v.p99)} | ${ms(v.max)} |`
  ),
  '',
];

const markdown = lines.join('\n');
console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
