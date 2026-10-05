import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.js';

test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

test("uses text large enough that mobile browsers don't zoom in on focus", async ({ editor }) => {
  await editor.sourceBox.tap();
  const fontSize = await editor.sourceBox.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
});

test("keeps a search's fields large enough that mobile browsers don't zoom in on them", async ({ editor, page }) => {
  await editor.sourceBox.tap();
  await page.keyboard.press('ControlOrMeta+f');
  const field = page.locator('source-editor .cm-search .cm-textfield').first();
  await expect(field).toBeFocused();
  const fontSize = await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
});

test('uses a text size that was picked, even a smaller one', async ({ editor, page }) => {
  await expect(editor.sourceBox).toBeVisible();
  await page.evaluate(() => localStorage.setItem('graphix:text-size', '12'));
  await page.reload();
  await expect(editor.sourceBox).toBeVisible();
  const fontSize = await editor.sourceBox.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBe(12);

  await page.getByRole('button', { name: 'Settings' }).tap();
  await expect(page.getByRole('menu', { name: 'Settings' }).getByRole('status')).toHaveText('12');
});

// Emulation has no collapsing browser toolbar, so 100vh equals the viewport here
// and this can't catch a vh-sized layout; it guards against overflow in general.
test("doesn't scroll the page at phone size", async ({ editor, page }) => {
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

test.describe('when an on-screen keyboard covers part of the page', () => {
  // Emulation has no on-screen keyboard, so stand in for iOS's: it leaves the
  // layout alone, shrinks the visual viewport, and slides that down the page.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const viewport = Object.assign(new EventTarget(), {
        width: innerWidth,
        height: innerHeight,
        offsetLeft: 0,
        offsetTop: 0,
        scale: 1,
      });
      Object.defineProperty(window, 'visualViewport', { value: viewport });
    });
  });

  /** Moves the fake visual viewport, as the keyboard opening or zooming would. */
  function setVisualViewport(page: Page, changes: object) {
    return page.evaluate((changes) => {
      Object.assign(window.visualViewport!, changes);
      window.visualViewport!.dispatchEvent(new Event('resize'));
      window.visualViewport!.dispatchEvent(new Event('scroll'));
    }, changes);
  }

  const appBox = async (page: Page) => (await page.locator('graphix-app').boundingBox())!;

  test('fits the editor to the visible part of the page', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    await setVisualViewport(page, { height: 380, offsetTop: 150 });

    await expect.poll(async () => (await appBox(page)).height).toBe(380);
    expect((await appBox(page)).y).toBe(150);
    // Both panes still fit in what's visible.
    const preview = (await page.locator('preview-pane').boundingBox())!;
    expect(preview.y + preview.height).toBeLessThanOrEqual(150 + 380 + 1);

    await setVisualViewport(page, { height: 664, offsetTop: 0 });
    await expect.poll(async () => (await appBox(page)).height).toBe(664);
    expect((await appBox(page)).y).toBe(0);
  });

  test('leaves pinch-zoom alone', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    await setVisualViewport(page, { height: 332, offsetTop: 100, scale: 2 });

    expect(await appBox(page)).toMatchObject({ y: 0, height: 664 });
  });
});
