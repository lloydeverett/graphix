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

test('sits just left of Refresh, starting on graphix', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await expect(picker(page)).toHaveValue('graphix');
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

test('"HTML only" leaves the browser defaults', async ({ editor }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await chooseBaseStyle(editor, 'none');
  expect(await editor.inPreview(() => getComputedStyle(document.body).margin)).toBe('8px');

  await chooseBaseStyle(editor, 'graphix');
  expect(await editor.inPreview(() => getComputedStyle(document.body).margin)).toBe('16px');
});

test.describe('when a Base Style fails to load', () => {
  test.use({ allowedErrors: [/Failed to load resource/] });

  test('keeps the one it has', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    // Dev builds add a query string.
    const waterDark = /\/water\.css-dark\.[^/?]*css(\?|$)/;
    await page.route(waterDark, (route) => route.abort());

    const failed = page.waitForEvent('requestfailed', (request) => waterDark.test(request.url()));
    await picker(page).selectOption('water.css-dark');
    await failed;
    await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'graphix');
    expect(await editor.inPreview(() => getComputedStyle(document.body).margin)).toBe('16px');

    // And can still change to another.
    await page.unroute(waterDark);
    await chooseBaseStyle(editor, 'sakura');
  });
});

test('shows a Render Error under any Base Style', async ({ editor }) => {
  await chooseBaseStyle(editor, 'none');
  await editor.setSource('<gx-mermaid>\nflowchart LR\n  A -->\n</gx-mermaid>');
  const alert = editor.preview.getByRole('alert');
  await expect(alert).toBeVisible();
  // The graphix Base Style's error colours, though it isn't loaded.
  await expect(alert).toHaveCSS('background-color', 'rgb(255, 235, 233)');
  await expect(alert).toHaveCSS('border-top-color', 'rgb(255, 129, 130)');
});

test('loads every Base Style from our own origin', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const origin = new URL(page.url()).origin;
  const elsewhere: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.origin !== origin) elsewhere.push(url.href);
  });

  // Text in Tufte's fonts, so they load too.
  await editor.setSource('<h1>Heading</h1><p>Some <em>text</em> and <strong>more</strong>.</p>');
  const ids = await picker(page).locator('option').evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  expect(ids.length).toBeGreaterThan(20);
  for (const id of ids) await chooseBaseStyle(editor, id);
  await page.waitForLoadState('networkidle');

  expect(elsewhere).toEqual([]);
});
