import { test, expect } from '@playwright/test';
import { openPresentation } from '../support/slipshow.mjs';

test('captures selected action states instead of every presentation step', async ({ page }) => {
  let presentation = await openPresentation(page, 'portfolio.html', 0);
  await expect(presentation.locator('#revealed-later')).toHaveCSS('opacity', '0');
  await expect(presentation.locator('#slipshow-open-window')).toHaveScreenshot(
    'state-00-initial.png',
  );

  // Compiler-generated entry actions occupy step 1; step 2 is the reveal.
  presentation = await openPresentation(page, 'portfolio.html', 2);
  await expect(presentation.locator('#revealed-later')).toHaveCSS('opacity', '1');
  await expect(presentation.locator('#slipshow-open-window')).toHaveScreenshot(
    'state-02-revealed.png',
  );

  presentation = await openPresentation(page, 'portfolio.html', 3);
  await expect(presentation.locator('#slipshow-open-window')).toHaveScreenshot(
    'state-03-focused.png',
  );
});

test('captures each built-in theme against its own baseline', async ({ page }) => {
  let presentation = await openPresentation(page, 'portfolio.html');
  await expect(presentation.locator('#portfolio-slide')).toHaveScreenshot(
    'theme-default.png',
  );

  presentation = await openPresentation(page, 'portfolio-vanier.html');
  await expect(presentation.locator('.slide')).toHaveScreenshot('theme-vanier.png');
});
