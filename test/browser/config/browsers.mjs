import { devices } from '@playwright/test';

// Keep engine choice separate from viewport coverage. The project names are
// also part of the snapshot path, so Chromium never compares against Firefox.
export const browserProjects = [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      browserName: 'chromium',
    },
  },
  {
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      browserName: 'firefox',
    },
  },
];
