import { test, expect } from '@playwright/test';
import { viewports } from '../config/viewports.mjs';
import {
  expectNoBrowserErrors,
  observeBrowserErrors,
  openPresentation,
} from '../support/slipshow.mjs';

for (const [viewportName, viewport] of Object.entries(viewports)) {
  test(`fits and centres a 4:3 presentation in ${viewportName}`, async ({ page }) => {
    const browserErrors = observeBrowserErrors(page);
    await page.setViewportSize(viewport);
    const presentation = await openPresentation(page, 'portfolio.html');

    const geometry = await presentation.locator('#slipshow-open-window').evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      };
    });

    expect(geometry.left).toBeGreaterThanOrEqual(-0.5);
    expect(geometry.top).toBeGreaterThanOrEqual(-0.5);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth + 0.5);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 0.5);
    expect(geometry.width / geometry.height).toBeCloseTo(4 / 3, 2);
    expect(geometry.left).toBeCloseTo(
      (geometry.viewportWidth - geometry.width) / 2,
      0,
    );
    expect(geometry.top).toBeCloseTo(
      (geometry.viewportHeight - geometry.height) / 2,
      0,
    );

    await expect(page).toHaveScreenshot(`layout-${viewportName}.png`);
    await expectNoBrowserErrors(browserErrors);
  });
}

test('the projected content is not clipped at its design viewport', async ({ page }) => {
  const presentation = await openPresentation(page, 'portfolio.html');
  await expect(presentation.locator('#slipshow-open-window')).toHaveScreenshot(
    'projected-content.png',
  );
});
