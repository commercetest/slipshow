import { test, expect } from '@playwright/test';
import {
  installReadyListener,
  presentationUrl,
} from '../support/slipshow.mjs';

test('lays out the cloned presentation and presenter notes', async ({ page }) => {
  await installReadyListener(page);
  await page.goto(presentationUrl('speaker.html'));
  await page.evaluate(() => globalThis.__slipshowReady);

  const presentation = page.frameLocator('#slipshow__internal_iframe');
  const popupPromise = page.waitForEvent('popup');
  await presentation.locator('body').press('s');
  const speaker = await popupPromise;
  await speaker.waitForLoadState('domcontentloaded');

  // The first boundary enters the slide; the second executes the note action.
  await presentation.locator('body').press('ArrowRight');
  await presentation.locator('body').press('ArrowRight');
  await expect(speaker.locator('#notes_div')).toContainText(
    'visual baselines are browser-specific',
  );
  await expect(speaker).toHaveScreenshot('speaker-view.png', {
    mask: [speaker.locator('#timer'), speaker.locator('#clock')],
    maskColor: '#808080',
  });
});
