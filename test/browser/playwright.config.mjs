import { defineConfig } from '@playwright/test';
import { browserProjects } from './config/browsers.mjs';
import { primaryViewport } from './config/viewports.mjs';
import { runtimeConfiguration } from './config/runtime.mjs';
import { snapshotConfiguration } from './config/snapshots.mjs';

export default defineConfig({
  ...runtimeConfiguration,
  ...snapshotConfiguration,
  globalSetup: './config/global-setup.mjs',
  projects: browserProjects.map((project) => ({
    ...project,
    use: {
      ...runtimeConfiguration.use,
      ...project.use,
      viewport: primaryViewport,
    },
  })),
});
