import { expect, test } from './fixtures.js';

test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

test("uses text large enough that mobile browsers don't zoom in on focus", async ({ editor }) => {
  await editor.sourceBox.tap();
  const fontSize = await editor.sourceBox.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
});

test('fits the viewport exactly, with no page scrolling', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  // A long unbroken line must wrap rather than widen the page.
  await editor.setSource(`<p>${'x'.repeat(500)}</p>`);
  await expect(editor.preview.locator('body > p')).toBeVisible();

  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerWidth,
    innerHeight,
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.innerWidth);
  expect(size.scrollHeight).toBeLessThanOrEqual(size.innerHeight);
});
