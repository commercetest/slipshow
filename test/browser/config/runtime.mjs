export const runtimeConfiguration = {
  testDir: './tests',
  outputDir: './test-results',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Visual baselines are easier to reproduce and review when one browser page
  // at a time is exercising global keyboard and popup behavior.
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: './playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
};
