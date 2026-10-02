import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

const generated = fileURLToPath(new URL('../generated/', import.meta.url));

export function presentationUrl(name) {
  const url = pathToFileURL(path.join(generated, name));
  return url.href;
}

export async function installReadyListener(page) {
  await page.addInitScript(() => {
    globalThis.__slipshowReady = new Promise((resolve) => {
      addEventListener('message', (event) => {
        if (
          typeof event.data === 'string' &&
          event.data.includes('(payload Ready)')
        ) {
          resolve(event.data);
        }
      });
    });
  });
}

export async function openPresentation(page, name, step = 0) {
  await installReadyListener(page);
  await page.goto(presentationUrl(name));
  await page.evaluate(() => globalThis.__slipshowReady);
  await page.evaluate(() => document.fonts.ready);
  const presentation = page.frameLocator('#slipshow__internal_iframe');
  await presentation.locator('body').evaluate(() => document.fonts.ready);
  await expect(presentation.locator('#slipshow-open-window')).toBeVisible();
  for (let currentStep = 1; currentStep <= step; currentStep += 1) {
    await presentation.locator('body').press('ArrowRight');
    await expect(presentation.locator('#slipshow-counter')).toHaveText(
      String(currentStep),
    );
  }
  await presentation.locator('body').evaluate(async () => {
    const snapshot = () =>
      [...document.querySelectorAll('.slipshow-rescaler')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const transform = getComputedStyle(element).transform;
          return [rect.x, rect.y, rect.width, rect.height]
            .map((value) => value.toFixed(3))
            .concat(transform)
            .join(':');
        })
        .join('|');

    await new Promise((resolve) => {
      let previous = '';
      let stableFrames = 0;
      const sample = () => {
        const current = snapshot();
        stableFrames = current === previous ? stableFrames + 1 : 0;
        previous = current;
        if (stableFrames >= 4) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });
  return presentation;
}

export function observeBrowserErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

export async function expectNoBrowserErrors(errors) {
  expect(errors, errors.join('\n')).toEqual([]);
}
