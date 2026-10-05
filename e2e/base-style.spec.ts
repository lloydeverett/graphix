import type { MenuItem } from '../src/context-menu.js';
import { type Editor, expect, test } from './fixtures.js';

/** The ids of the Base Styles in the menu, in order. */
const baseStyleIds = (editor: Editor) =>
  editor.page.locator('#base-style-menu menu-item').evaluateAll((items) => items.map((item) => (item as MenuItem).value));

const bodyBackground = (editor: Editor) =>
  editor.inPreview(() => getComputedStyle(document.body).backgroundColor);

test('sits just left of Refresh, starting on water.css', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await expect(editor.baseStylePicker).toHaveAccessibleName('Base style: water.css');
  await expect(editor.baseStylePicker).toHaveText('water.css');
  const pickerBox = (await editor.baseStylePicker.boundingBox())!;
  const refreshBox = (await page.getByRole('button', { name: 'Refresh' }).boundingBox())!;
  expect(refreshBox.x - (pickerBox.x + pickerBox.width)).toBeGreaterThanOrEqual(0);
  expect(refreshBox.x - (pickerBox.x + pickerBox.width)).toBeLessThan(12);
});

test('lists water.css first, then its light and dark variants', async ({ editor }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const ids = await baseStyleIds(editor);
  expect(ids.slice(0, 3)).toEqual(['water.css', 'water.css-light', 'water.css-dark']);
});

test('restyles the Preview in place, and keeps the choice', async ({ editor, page }) => {
  await editor.setSource('<p>styled</p>');
  await expect(editor.preview.getByText('styled')).toBeVisible();
  await editor.mark('p');

  // water.css-dark's background is #202b38.
  await editor.chooseBaseStyle('water.css-dark');
  expect(await bodyBackground(editor)).toBe('rgb(32, 43, 56)');
  expect(await editor.isMarked('p')).toBe(true);

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => editor.isMarked('p')).toBe(false);
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css-dark');
  expect(await bodyBackground(editor)).toBe('rgb(32, 43, 56)');

  await page.reload();
  await expect(editor.baseStylePicker).toHaveAccessibleName('Base style: water.css-dark');
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css-dark');
  expect(await bodyBackground(editor)).toBe('rgb(32, 43, 56)');
});

test('water.css is the default, dark or light to match the colour scheme', async ({ editor, page }) => {
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
  // water.css-light's background is #fff, and water.css-dark's #202b38.
  expect(await bodyBackground(editor)).toBe('rgb(255, 255, 255)');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => bodyBackground(editor)).toBe('rgb(32, 43, 56)');

  await page.reload();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
  await expect.poll(() => bodyBackground(editor)).toBe('rgb(32, 43, 56)');

  // With no preference, it's light.
  await page.emulateMedia({ colorScheme: 'no-preference' });
  await expect.poll(() => bodyBackground(editor)).toBe('rgb(255, 255, 255)');
});

test('starts on water.css when the saved Base Style is gone', async ({ editor, page }) => {
  await page.evaluate(() => localStorage.setItem('graphix:base-style', 'graphix'));
  await page.reload();
  await expect(editor.baseStylePicker).toHaveAccessibleName('Base style: water.css');
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
});

test('"HTML only" leaves the browser defaults', async ({ editor }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await editor.chooseBaseStyle('none');
  expect(await editor.inPreview(() => getComputedStyle(document.body).margin)).toBe('8px');

  expect(await bodyBackground(editor)).toBe('rgba(0, 0, 0, 0)');

  await editor.chooseBaseStyle('water.css');
  expect(await bodyBackground(editor)).toBe('rgb(255, 255, 255)');
});

test.describe('when a Base Style fails to load', () => {
  test.use({ allowedErrors: [/Failed to load resource/] });

  test('keeps the one it has', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
    // Dev builds add a query string.
    const sakura = /\/sakura\.[^/?]*css(\?|$)/;
    await page.route(sakura, (route) => route.abort());

    const failed = page.waitForEvent('requestfailed', (request) => sakura.test(request.url()));
    await editor.pickBaseStyle('sakura');
    await failed;
    await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
    expect(await bodyBackground(editor)).toBe('rgb(255, 255, 255)');

    // And can still change to another.
    await page.unroute(sakura);
    await editor.chooseBaseStyle('writ');
  });
});

test('shows a Render Error under any Base Style, in the colour scheme', async ({ editor, page }) => {
  await editor.chooseBaseStyle('none');
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
  expect(firstBaseStyle).toBe('water.css');
});

test('loads every Base Style from our own origin', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const origin = new URL(page.url()).origin;
  const elsewhere: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.origin !== origin) elsewhere.push(url.href);
  });

  const ids = await baseStyleIds(editor);
  expect(ids.length).toBeGreaterThan(20);
  for (const id of ids) await editor.chooseBaseStyle(id);
  await page.waitForLoadState('networkidle');

  expect(elsewhere).toEqual([]);
});

test('the menu opens on the chosen Base Style, marked as chosen', async ({ editor }) => {
  await editor.chooseBaseStyle('sakura');
  await editor.baseStylePicker.click();
  const sakura = editor.baseStyleItem('sakura');
  await expect(sakura).toBeFocused();
  await expect(sakura).toBeChecked();
  await expect(editor.baseStyleItem('water.css')).not.toBeChecked();
  await expect(editor.baseStyleMenu.getByRole('menuitemradio', { checked: true })).toHaveCount(1);
});

test('tries on each Base Style under the pointer, and puts back the chosen one if none is chosen', async ({
  editor,
  page,
}) => {
  await editor.setSource('<p>styled</p>');
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
  await editor.mark('p');

  await editor.baseStylePicker.click();
  await editor.baseStyleItem('water.css-dark').hover();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css-dark');
  expect(await bodyBackground(editor)).toBe('rgb(32, 43, 56)');
  await editor.baseStyleItem('sakura').hover();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'sakura');
  // Restyled in place, like choosing one.
  expect(await editor.isMarked('p')).toBe(true);

  // Escape closes the menu without choosing, so the chosen one comes back.
  await page.keyboard.press('Escape');
  await expect(editor.baseStyleMenu).toBeHidden();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
  await expect(editor.baseStylePicker).toHaveText('water.css');

  // As does clicking away.
  await editor.baseStylePicker.click();
  await editor.baseStyleItem('writ').hover();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'writ');
  await editor.sourceBox.click();
  await expect(editor.baseStyleMenu).toBeHidden();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');

  // Nothing tried on is kept.
  await page.reload();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
});

test('tries on Base Styles from the keyboard, and Enter chooses one', async ({ editor, page }) => {
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
  await editor.baseStylePicker.focus();
  await page.keyboard.press('Enter');
  await expect(editor.baseStyleItem('water.css')).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css-light');
  await page.keyboard.press('ArrowDown');
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css-dark');
  await page.keyboard.press('Enter');
  await expect(editor.baseStyleMenu).toBeHidden();
  await expect(editor.baseStylePicker).toBeFocused();
  await expect(editor.baseStylePicker).toHaveText('water.css-dark');
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css-dark');

  await page.reload();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css-dark');
});

test('puts back the chosen Base Style while the pointer is outside the menu', async ({ editor }) => {
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
  await editor.baseStylePicker.click();
  await editor.baseStyleItem('sakura').hover();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'sakura');

  await editor.baseStylePicker.hover();
  await expect(editor.baseStyleMenu).toBeVisible();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');

  await editor.baseStyleItem('writ').hover();
  await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'writ');
});

test.describe('on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

  test('scrolling the menu tries nothing on, and a tap chooses', async ({ editor, page }) => {
    await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'water.css');
    await editor.baseStylePicker.tap();
    await expect(editor.baseStyleMenu).toBeVisible();
    // Note every Base Style the Preview shows, however briefly.
    await editor.inPreview(() => {
      const shown: string[] = [];
      Object.assign(window, { graphixShownStyles: shown });
      new MutationObserver(() => shown.push(document.documentElement.dataset.baseStyle!)).observe(
        document.documentElement,
        { attributeFilter: ['data-base-style'] },
      );
    });

    // Playwright can only tap, so drag a finger up the menu through Chromium directly.
    const box = (await editor.baseStyleMenu.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 10 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(editor.baseStyleItem('water.css')).toBeFocused();
    // Give a stray try-on time to reach the Preview.
    await page.waitForTimeout(500);
    const shown = await editor.inPreview(() => (window as unknown as { graphixShownStyles: string[] }).graphixShownStyles);
    expect(shown).toEqual([]);

    await editor.baseStyleItem('writ').tap();
    await expect(editor.baseStyleMenu).toBeHidden();
    await expect(editor.shownBaseStyle).toHaveAttribute('data-base-style', 'writ');
  });
});
