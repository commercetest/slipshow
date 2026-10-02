import { test, expect } from '@playwright/test';
import { viewports } from '../config/viewports.mjs';
import { openPresentation } from '../support/slipshow.mjs';

test('keeps a pointer-drawn stroke aligned after a viewport resize', async ({ page }) => {
  const presentation = await openPresentation(page, 'portfolio.html', 4);
  await presentation.locator('body').press('p');
  await expect(presentation.locator('body')).toHaveClass(/slipshow-drawing-mode/);

  const target = await presentation.locator('#revealed-later').boundingBox();
  expect(target).not.toBeNull();
  const y = target.y + target.height / 2;
  await page.mouse.move(target.x + 30, y);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width - 30, y, { steps: 12 });
  await page.mouse.up();

  await expect(presentation.locator('#slipshow-drawing-elem path')).toHaveCount(1);
  await expect(page).toHaveScreenshot('drawing-design-4x3.png');

  await page.setViewportSize(viewports.widescreen);
  await expect(page).toHaveScreenshot('drawing-after-wide-resize.png');
});
