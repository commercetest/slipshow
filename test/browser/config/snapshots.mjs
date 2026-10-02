import path from 'node:path';
import { fileURLToPath } from 'node:url';

const browserRoot = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

export const snapshotConfiguration = {
  // Browser and platform are intentionally visible. A macOS baseline must not
  // silently become the expectation for a Linux CI runner.
  snapshotPathTemplate:
    '{testDir}/snapshots/{projectName}/{platform}/{testFilePath}/{arg}{ext}',
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      stylePath: path.join(browserRoot, 'support', 'screenshot.css'),
      // Deliberately do not set a broad maxDiffPixelRatio. Per-test tolerances
      // should be justified against an observed source of rendering noise.
    },
  },
};
