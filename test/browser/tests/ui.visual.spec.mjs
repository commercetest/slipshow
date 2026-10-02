import { test, expect } from '@playwright/test';
import { openPresentation } from '../support/slipshow.mjs';

test('captures the table of contents', async ({ page }) => {
  const presentation = await openPresentation(page, 'portfolio.html');
  await presentation.locator('body').press('t');
  await expect(presentation.locator('body')).toHaveClass(/slipshow-toc-mode/);
  await expect(page).toHaveScreenshot('table-of-contents.png');
});

test('captures the expanded drawing toolbar', async ({ page }) => {
  const presentation = await openPresentation(page, 'portfolio.html');
  await presentation.locator('body').press('p');
  const toolbar = presentation.locator('#slipshow-drawing-toolbar');
  await toolbar.hover();
  await expect(toolbar).toHaveScreenshot('drawing-toolbar-expanded.png');
});
