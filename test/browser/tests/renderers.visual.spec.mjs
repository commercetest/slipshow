import { test, expect } from '@playwright/test';
import {
  expectNoBrowserErrors,
  observeBrowserErrors,
  openPresentation,
} from '../support/slipshow.mjs';

test('renders embedded math, Mermaid, and highlighted code', async ({ page }) => {
  const browserErrors = observeBrowserErrors(page);
  const presentation = await openPresentation(page, 'renderers.html');
  await expect(presentation.locator('mjx-container')).toBeVisible();
  await expect(presentation.locator('.mermaid svg')).toBeVisible();
  await expect(presentation.locator('code.hljs')).toBeVisible();
  await expect(presentation.locator('#slipshow-open-window')).toHaveScreenshot(
    'embedded-renderers.png',
  );
  await expectNoBrowserErrors(browserErrors);
});
