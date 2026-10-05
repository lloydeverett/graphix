import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.js';

const LONG_LINE = `<p>${'word '.repeat(200)}</p>`;

test('the Source has a toolbar the same height as the Preview', async ({ editor, page }) => {
  await expect(editor.sourceBox).toBeVisible();
  const source = await page.locator('.source > header').boundingBox();
  const preview = await page.locator('preview-pane header').boundingBox();
  expect(source!.height).toBe(preview!.height);
  expect(source!.y).toBe(preview!.y);
});

test('Settings is an icon button that opens a menu', async ({ editor, page }) => {
  await expect(editor.sourceBox).toBeVisible();
  const settings = page.getByRole('button', { name: 'Settings' });
  await expect(settings.locator('svg')).toBeVisible();
  await expect(settings).toHaveText('');

  const menu = page.getByRole('menu', { name: 'Settings' });
  await expect(menu).toBeHidden();
  await settings.click();
  await expect(menu).toBeVisible();
  await expectMenuUnderGear(page);

  // Clicking the button again closes it.
  await settings.click();
  await expect(menu).toBeHidden();
  await settings.click();
  await expect(menu).toBeVisible();
  await editor.sourceBox.click();
  await expect(menu).toBeHidden();
});

/** Checks the settings menu sits just below the gear, its right edge lined up with the gear's, over the Source. */
async function expectMenuUnderGear(page: Page) {
  const button = (await page.getByRole('button', { name: 'Settings' }).boundingBox())!;
  const menu = (await page.getByRole('menu', { name: 'Settings' }).boundingBox())!;
  const source = (await page.locator('.source').boundingBox())!;
  expect(menu.y).toBeGreaterThan(button.y + button.height);
  expect(menu.y).toBeLessThan(button.y + button.height + 10);
  expect(menu.x + menu.width).toBeCloseTo(button.x + button.width, 0);
  expect(menu.x).toBeGreaterThanOrEqual(source.x);
  expect(menu.x + menu.width).toBeLessThanOrEqual(source.x + source.width);
}

test('the settings menu follows the gear as the window resizes', async ({ editor, page }) => {
  await expect(editor.sourceBox).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expectMenuUnderGear(page);

  await page.setViewportSize({ width: 900, height: 600 });
  await expect(page.getByRole('menu', { name: 'Settings' })).toBeVisible();
  await expectMenuUnderGear(page);
});

test.describe('on a narrow screen', () => {
  test.use({ viewport: { width: 400, height: 700 } });

  test('the settings menu opens over the Source', async ({ editor, page }) => {
    await expect(editor.sourceBox).toBeVisible();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expectMenuUnderGear(page);
  });
});

test('clicking in the Preview closes the settings menu', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const menu = page.getByRole('menu', { name: 'Settings' });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(menu).toBeVisible();

  await editor.preview.locator('h1').click();
  await expect(menu).toBeHidden();
});

test('word wrap is on by default, and can be turned off and stays off', async ({ editor, page }) => {
  await editor.setSource(LONG_LINE);
  const scroller = page.locator('source-editor .cm-scroller');
  const wraps = () => scroller.evaluate((element) => element.scrollWidth <= element.clientWidth);
  const wordWrap = page.getByRole('menuitemcheckbox', { name: 'Word wrap' });
  await expect.poll(wraps).toBe(true);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(wordWrap).toBeChecked();
  await wordWrap.click();
  await expect(wordWrap).toBeHidden();
  await expect.poll(wraps).toBe(false);

  await page.reload();
  await expect(editor.sourceBox).toContainText('word word');
  await expect.poll(wraps).toBe(false);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(wordWrap).not.toBeChecked();
  await wordWrap.click();
  await expect.poll(wraps).toBe(true);
});

test('the Source is in Cascadia Mono, served from this site, unless Use system font is on', async ({ editor, page }) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });
  await page.reload();
  const content = page.locator('source-editor .cm-content');
  const fontFamily = () => content.evaluate((element) => getComputedStyle(element).fontFamily);
  const cascadiaLoaded = () =>
    page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some((face) => face.family.includes('Cascadia Mono') && face.status === 'loaded');
    });
  const systemFont = page.getByRole('menuitemcheckbox', { name: 'Use system font' });

  await expect(editor.sourceBox).toBeVisible();
  await expect.poll(fontFamily).toMatch(/^"?Cascadia Mono"?,/);
  await expect.poll(cascadiaLoaded).toBe(true);
  expect(fontRequests.length).toBeGreaterThan(0);
  const origin = new URL(page.url()).origin;
  for (const url of fontRequests) expect(new URL(url).origin).toBe(origin);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(systemFont).not.toBeChecked();
  await systemFont.click();
  await expect.poll(fontFamily).toBe('ui-monospace, monospace');

  await page.reload();
  await expect(editor.sourceBox).toBeVisible();
  await expect.poll(fontFamily).toBe('ui-monospace, monospace');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(systemFont).toBeChecked();
  await systemFont.click();
  await expect.poll(fontFamily).toMatch(/^"?Cascadia Mono"?,/);
});

test('the settings menu works from the keyboard', async ({ editor, page }) => {
  await editor.setSource(LONG_LINE);
  const settings = page.getByRole('button', { name: 'Settings' });
  const menu = page.getByRole('menu', { name: 'Settings' });
  const wordWrap = page.getByRole('menuitemcheckbox', { name: 'Word wrap' });

  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(wordWrap).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(settings).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(wordWrap).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitemcheckbox', { name: 'Use system font' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(wordWrap).toBeFocused();
  await page.keyboard.press(' ');
  await expect(menu).toBeHidden();
  await expect(settings).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(wordWrap).not.toBeChecked();
});
