import type { Page } from '@playwright/test';
import { type Editor, expect, test } from './fixtures.js';

const picker = (page: Page) => page.getByRole('combobox', { name: 'Base style' });

/** Chooses a Base Style and waits for the Preview to show it. */
async function chooseBaseStyle(editor: Editor, id: string) {
  await picker(editor.page).selectOption(id);
  await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', id);
}

const bodyBackground = (editor: Editor) =>
  editor.inPreview(() => getComputedStyle(document.body).backgroundColor);

test('sits just left of Refresh, starting on default', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await expect(picker(page)).toHaveValue('default');
  const pickerBox = (await picker(page).boundingBox())!;
  const refreshBox = (await page.getByRole('button', { name: 'Refresh' }).boundingBox())!;
  expect(refreshBox.x - (pickerBox.x + pickerBox.width)).toBeGreaterThanOrEqual(0);
  expect(refreshBox.x - (pickerBox.x + pickerBox.width)).toBeLessThan(12);
});

test('restyles the Preview in place, and keeps the choice', async ({ editor, page }) => {
  await editor.setSource('<p>styled</p>');
  await expect(editor.preview.getByText('styled')).toBeVisible();
  await editor.mark('p');

  // water.css-dark's background is #202b38.
  await chooseBaseStyle(editor, 'water.css-dark');
  expect(await bodyBackground(editor)).toBe('rgb(32, 43, 56)');
  expect(await editor.isMarked('p')).toBe(true);

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => editor.isMarked('p')).toBe(false);
  await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'water.css-dark');
  expect(await bodyBackground(editor)).toBe('rgb(32, 43, 56)');

  await page.reload();
  await expect(picker(page)).toHaveValue('water.css-dark');
  await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'water.css-dark');
  expect(await bodyBackground(editor)).toBe('rgb(32, 43, 56)');
});

test('default is water.css, dark or light to match the colour scheme', async ({ editor, page }) => {
  await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'default');
  // water.css-light's background is #fff, and water.css-dark's #202b38.
  expect(await bodyBackground(editor)).toBe('rgb(255, 255, 255)');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => bodyBackground(editor)).toBe('rgb(32, 43, 56)');

  await page.reload();
  await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'default');
  await expect.poll(() => bodyBackground(editor)).toBe('rgb(32, 43, 56)');

  // With no preference, it's light.
  await page.emulateMedia({ colorScheme: 'no-preference' });
  await expect.poll(() => bodyBackground(editor)).toBe('rgb(255, 255, 255)');
});

test('starts on default when the saved Base Style is gone', async ({ editor, page }) => {
  await page.evaluate(() => localStorage.setItem('graphix:base-style', 'graphix'));
  await page.reload();
  await expect(picker(page)).toHaveValue('default');
  await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'default');
});

test('"HTML only" leaves the browser defaults', async ({ editor }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await chooseBaseStyle(editor, 'none');
  expect(await editor.inPreview(() => getComputedStyle(document.body).margin)).toBe('8px');

  expect(await bodyBackground(editor)).toBe('rgba(0, 0, 0, 0)');

  await chooseBaseStyle(editor, 'default');
  expect(await bodyBackground(editor)).toBe('rgb(255, 255, 255)');
});

test.describe('when a Base Style fails to load', () => {
  test.use({ allowedErrors: [/Failed to load resource/] });

  test('keeps the one it has', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'default');
    // Dev builds add a query string.
    const sakura = /\/sakura\.[^/?]*css(\?|$)/;
    await page.route(sakura, (route) => route.abort());

    const failed = page.waitForEvent('requestfailed', (request) => sakura.test(request.url()));
    await picker(page).selectOption('sakura');
    await failed;
    await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'default');
    expect(await bodyBackground(editor)).toBe('rgb(255, 255, 255)');

    // And can still change to another.
    await page.unroute(sakura);
    await chooseBaseStyle(editor, 'writ');
  });
});

test('shows a Render Error under any Base Style, in the colour scheme', async ({ editor, page }) => {
  await chooseBaseStyle(editor, 'none');
  await editor.setSource('<gx-mermaid>\nflowchart LR\n  A -->\n</gx-mermaid>');
  const alert = editor.preview.getByRole('alert');
  await expect(alert).toBeVisible();
  // graphix's own error colours, whatever the Base Style.
  await expect(alert).toHaveCSS('background-color', 'rgb(255, 235, 233)');
  await expect(alert).toHaveCSS('border-top-color', 'rgb(255, 129, 130)');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(alert).toHaveCSS('background-color', 'rgb(60, 22, 24)');
  await expect(alert).toHaveCSS('border-top-color', 'rgb(142, 21, 25)');
});

test('shows the Source only once its Base Style has loaded', async ({ editor, page }) => {
  // Chromium holds the first paint for these stylesheets anyway, but other
  // browsers may not, so note the Base Style shown when the Source arrives.
  await page.addInitScript(() => {
    if (!location.pathname.endsWith('preview.html')) return;
    new MutationObserver((_, observer) => {
      if (!document.body?.firstElementChild) return;
      Object.assign(window, { graphixFirstBaseStyle: document.documentElement.dataset.baseStyle });
      observer.disconnect();
    }).observe(document, { childList: true, subtree: true });
  });
  // Dev builds add a query string.
  await page.route(/\/water\.css-(dark|light)\.[^/?]*css(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.reload();
  await expect(editor.preview.locator('h1')).toBeVisible();
  const firstBaseStyle = await editor.inPreview(
    () => (window as unknown as { graphixFirstBaseStyle?: string }).graphixFirstBaseStyle,
  );
  expect(firstBaseStyle).toBe('default');
});

test('loads every Base Style from our own origin', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const origin = new URL(page.url()).origin;
  const elsewhere: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.origin !== origin) elsewhere.push(url.href);
  });

  const ids = await picker(page).locator('option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(ids.length).toBeGreaterThan(20);
  for (const id of ids) await chooseBaseStyle(editor, id);
  await page.waitForLoadState('networkidle');

  expect(elsewhere).toEqual([]);
});
