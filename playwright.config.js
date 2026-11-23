// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Read-only checks against the live site. No test submits a booking or types an OTP.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,                // one retry so a network blip is not reported as a bug
  workers: 2,                // be gentle with the live site
  fullyParallel: false,
  reporter: [
    ['list'],
    ['json', { outputFile: 'results/results.json' }],
    ['html', { outputFolder: 'results/html', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://www.marham.pk',
    userAgent: 'MarhamQA/1.0 (+qa-agent; read-only) Playwright',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: { 'X-Marham-QA': '1' },
  },
  projects: [
    { name: 'api', testMatch: /(smoke|seo|onpage)\.spec\.js/ },
    { name: 'mobile', testMatch: /(booking|tracking|screens|speed)\.spec\.js/, use: { ...devices['Pixel 7'] } },
    { name: 'desktop', testMatch: /(tracking|screens)\.spec\.js/, use: { ...devices['Desktop Chrome'] } },
  ],
});
