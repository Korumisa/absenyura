import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !process.env.CI,
    env: { VITE_DEV_BYPASS_AUTH: '0', VITE_USE_MOCK_LANDING: 'false' },
  },
  use: {
    baseURL: 'http://127.0.0.1:5175',
    launchOptions: { args: ['--disable-gpu'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
