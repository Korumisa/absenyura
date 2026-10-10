// `npm test`                  → semua project + coverage (CI gate)
// `npm run test:unit`         → src/** saja (tanpa server)
// `npm run test:integration`  → server/** (controller/integration)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.{ts,tsx}'] } },
      { extends: true, test: { name: 'integration', include: ['server/**/*.test.ts'] } },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', 'prisma/', '**/*.d.ts', '**/*.config.*'],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 50 },
    },
  },
});
