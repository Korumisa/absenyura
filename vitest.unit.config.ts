// Run `npm run test:unit`  → src/** fast unit loops (no server)
// Run `npm run test:integration` → server/** controller/integration tests
// Run `npm run test` → MERGED coverage (CI gate; exit on threshold failure)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'prisma/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: { lines: 60, functions: 60, branches: 50, statements: 50 },
    },
  },
})
