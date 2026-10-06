import { type Editor, expect, test } from './fixtures.js';

/** The computed font-family of the Preview element at `selector`. */
const previewFontFamily = (editor: Editor, selector: string) => () =>
  editor.preview.locator(selector).first().evaluate((element) => getComputedStyle(element).fontFamily);

/** Whether the Preview has loaded a face of `family`. */
const previewFontLoaded = (editor: Editor, family: string) => () =>
  editor.inPreview(async () => {
    await document.fonts.ready;
    return [...document.fonts].map((face) => `${face.family}:${face.status}`);
  }).then((faces) => faces.some((face) => face.includes(family) && face.endsWith(':loaded')));

const settingsButton = (editor: Editor) => editor.page.getByRole('button', { name: 'Preview settings' });

test('the Preview settings gear sits just right of Refresh, and opens a menu titled by section', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const settings = settingsButton(editor);
  await expect(settings.locator('svg')).toBeVisible();
  await expect(settings).toHaveText('');
  const refreshBox = (await page.getByRole('button', { name: 'Refresh' }).boundingBox())!;
  const settingsBox = (await settings.boundingBox())!;
  expect(settingsBox.x - (refreshBox.x + refreshBox.width)).toBeGreaterThanOrEqual(0);
  expect(settingsBox.x - (refreshBox.x + refreshBox.width)).toBeLessThan(12);

  const menu = page.getByRole('menu', { name: 'Preview settings' });
  await expect(menu).toBeHidden();
  await settings.click();
  await expect(menu).toBeVisible();
  const font = menu.getByRole('group', { name: 'Font' });
  await expect(font).toBeVisible();
  // The title sits at the start of its section, wherever the menu is.
  const title = font.getByText('Font', { exact: true });
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS('text-align', 'start');
  expect((await title.boundingBox())!.x).toBeLessThan((await font.boundingBox())!.x + 12);
  await expect(font.getByRole('menuitemradio')).toHaveText(['Lato', 'Inter', 'System']);
  // It opens on the font chosen.
  await expect(font.getByRole('menuitemradio', { name: 'Lato' })).toBeFocused();

  // Lined up with the gear's right edge.
  const menuBox = (await menu.boundingBox())!;
  expect(menuBox.y).toBeGreaterThan(settingsBox.y + settingsBox.height);
  expect(menuBox.x + menuBox.width).toBeCloseTo(settingsBox.x + settingsBox.width, 0);

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});

test("the Preview's text is in Lato, served from this site, over the Base Style's font", async ({ editor, page }) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') fontRequests.push(request.url());
  });
  await page.reload();
  await editor.setSource('<h1>Title</h1><p>Text</p><button>Go</button><pre>pre</pre><p><code>code</code></p>');
  await expect(editor.preview.locator('h1')).toHaveText('Title');

  for (const selector of ['body', 'h1', 'p', 'button']) {
    await expect.poll(previewFontFamily(editor, selector)).toBe('Lato, sans-serif');
  }
  // Code keeps the Base Style's monospace font.
  for (const selector of ['pre', 'code']) {
    await expect.poll(previewFontFamily(editor, selector)).not.toMatch(/Lato/);
  }
  await expect.poll(previewFontLoaded(editor, 'Lato')).toBe(true);
  const origin = new URL(page.url()).origin;
  expect(fontRequests.some((url) => /lato/.test(url))).toBe(true);
  for (const url of fontRequests) expect(new URL(url).origin).toBe(origin);

  // Over another Base Style's too.
  await editor.chooseBaseStyle('sakura');
  await expect.poll(previewFontFamily(editor, 'h1')).toBe('Lato, sans-serif');
});

test("the Source's styles win over the Preview's font", async ({ editor }) => {
  await editor.setSource('<style>h1 { font-family: serif }</style><h1>Title</h1><p>Text</p>');
  await expect(editor.preview.locator('h1')).toHaveText('Title');
  await expect.poll(previewFontFamily(editor, 'h1')).toBe('serif');
  await expect.poll(previewFontFamily(editor, 'p')).toBe('Lato, sans-serif');
});

test('choosing a font restyles the Preview in place, and keeps the choice', async ({ editor, page }) => {
  await editor.setSource('<p>styled</p>');
  await expect(editor.preview.getByText('styled')).toBeVisible();
  await editor.mark('p');
  const pFont = previewFontFamily(editor, 'p');
  const menu = page.getByRole('menu', { name: 'Preview settings' });

  await settingsButton(editor).click();
  await menu.getByRole('menuitemradio', { name: 'Inter' }).click();
  await expect(menu).toBeHidden();
  await expect.poll(pFont).toBe('Inter, sans-serif');
  await expect.poll(previewFontLoaded(editor, 'Inter')).toBe(true);
  expect(await editor.isMarked('p')).toBe(true);

  // System leaves the Base Style's own font; water.css's starts with system-ui.
  await settingsButton(editor).click();
  await menu.getByRole('menuitemradio', { name: 'System' }).click();
  await expect.poll(pFont).toMatch(/^system-ui,/);

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => editor.isMarked('p')).toBe(false);
  await expect.poll(pFont).toMatch(/^system-ui,/);

  await settingsButton(editor).click();
  await menu.getByRole('menuitemradio', { name: 'Inter' }).click();
  await page.reload();
  await expect(editor.preview.getByText('styled')).toBeVisible();
  await expect.poll(pFont).toBe('Inter, sans-serif');
  await settingsButton(editor).click();
  await expect(menu.getByRole('menuitemradio', { name: 'Inter' })).toBeChecked();
  await expect(menu.getByRole('menuitemradio', { name: 'Lato' })).not.toBeChecked();
});

test('starts on Lato when the saved font is gone', async ({ editor, page }) => {
  await page.evaluate(() => localStorage.setItem('graphix:preview-font', 'comic-sans'));
  await page.reload();
  await expect(editor.preview.locator('h1')).toBeVisible();
  await expect.poll(previewFontFamily(editor, 'h1')).toBe('Lato, sans-serif');
});

test('tries on each font under the pointer, and puts back the chosen one if none is chosen', async ({
  editor,
  page,
}) => {
  await editor.setSource('<p>styled</p>');
  await expect(editor.preview.getByText('styled')).toBeVisible();
  await editor.mark('p');
  const shownFont = editor.preview.locator(':root');
  const menu = page.getByRole('menu', { name: 'Preview settings' });
  const item = (name: string) => menu.getByRole('menuitemradio', { name });
  await expect(shownFont).toHaveAttribute('data-preview-font', 'lato');

  await settingsButton(editor).click();
  await item('Inter').hover();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'inter');
  await expect.poll(previewFontFamily(editor, 'p')).toBe('Inter, sans-serif');
  await item('System').hover();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'system');
  // Restyled in place, like choosing one.
  expect(await editor.isMarked('p')).toBe(true);

  // Leaving the fonts puts back the chosen one, to compare.
  await settingsButton(editor).hover();
  await expect(menu).toBeVisible();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'lato');

  // Escape closes the menu without choosing, so the chosen one comes back.
  await item('Inter').hover();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'inter');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'lato');

  // As does clicking away.
  await settingsButton(editor).click();
  await item('System').hover();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'system');
  await editor.sourceBox.click();
  await expect(menu).toBeHidden();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'lato');

  // Nothing tried on is kept.
  await page.reload();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'lato');
});

test('tries on fonts from the keyboard, and Enter chooses one', async ({ editor, page }) => {
  const shownFont = editor.preview.locator(':root');
  const menu = page.getByRole('menu', { name: 'Preview settings' });
  await expect(shownFont).toHaveAttribute('data-preview-font', 'lato');
  await settingsButton(editor).focus();
  await page.keyboard.press('Enter');
  await expect(menu.getByRole('menuitemradio', { name: 'Lato' })).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(shownFont).toHaveAttribute('data-preview-font', 'inter');
  await page.keyboard.press('ArrowDown');
  await expect(shownFont).toHaveAttribute('data-preview-font', 'system');
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(settingsButton(editor)).toBeFocused();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'system');

  await page.reload();
  await expect(shownFont).toHaveAttribute('data-preview-font', 'system');
});
