import type { Page } from '@playwright/test';
import { type Editor, expect, test } from './fixtures.js';

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

/** Reopens the editor with Vim mode on, and the Source set to `source` if given, focused in Normal mode. */
async function startInVimMode(editor: Editor, source?: string) {
  await editor.page.evaluate(() => localStorage.setItem('graphix:vim-mode', 'true'));
  await editor.page.reload();
  if (source !== undefined) await editor.setSource(source);
  await editor.sourceBox.click();
  await editor.page.keyboard.press('Escape');
}

/** The colour a theme.css token computes to, as getComputedStyle gives it. */
async function tokenColour(page: Page, token: string) {
  return page.evaluate((token) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${token})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, token);
}

test('Vim mode edits the Source with Vim keys, and stays as set', async ({ editor, page }) => {
  const vimMode = page.getByRole('menuitemcheckbox', { name: 'Vim mode' });
  const source = () => page.locator('source-editor').evaluate((element) => (element as HTMLElement & { value: string }).value);
  await editor.setSource('<p>one</p>\n<p>two</p>');

  // Off by default: typing inserts text.
  await editor.sourceBox.click();
  await page.keyboard.press('ControlOrMeta+Home');
  await page.keyboard.type('dd');
  await expect.poll(source).toBe('dd<p>one</p>\n<p>two</p>');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(vimMode).not.toBeChecked();
  await vimMode.click();
  await editor.setSource('<p>one</p>\n<p>two</p>');
  await editor.sourceBox.click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('g');
  await page.keyboard.press('g');
  await page.keyboard.type('dd');
  await expect.poll(source).toBe('<p>two</p>');
  await page.keyboard.type('u');
  await expect.poll(source).toBe('<p>one</p>\n<p>two</p>');

  await page.reload();
  await expect(editor.sourceBox).toBeVisible();
  await editor.sourceBox.click();
  await page.keyboard.press('Escape');
  await page.keyboard.type('ggx');
  await expect.poll(source).toBe('p>one</p>\n<p>two</p>');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(vimMode).toBeChecked();
  await vimMode.click();
  await editor.sourceBox.click();
  await page.keyboard.type('x');
  await expect.poll(source).toContain('x');
});

test("Vim mode's block cursor is the text's colour, with the letter under it in the background's", async ({ editor, page }) => {
  await startInVimMode(editor, '<p>one</p>');
  await page.keyboard.press('0');
  const cursor = page.locator('source-editor .cm-fat-cursor');
  const colours = () =>
    cursor.evaluate((element) => {
      const { backgroundColor, color } = getComputedStyle(element);
      return { backgroundColor, color, letter: element.textContent };
    });
  const fg = await tokenColour(page, '--fg');
  const surface = await tokenColour(page, '--surface');
  await expect.poll(colours).toEqual({ backgroundColor: fg, color: surface, letter: '<' });

  // While an operator waits, the cursor is half height, and Vim hides its letter.
  await page.keyboard.press('d');
  await expect.poll(async () => (await colours()).color).toBe('rgba(0, 0, 0, 0)');
  await page.keyboard.press('Escape');
  await expect.poll(colours).toEqual({ backgroundColor: fg, color: surface, letter: '<' });

  // Unfocused, it's an outline, and the letter beneath shows through.
  await page.getByRole('button', { name: 'Settings' }).focus();
  await expect.poll(colours).toEqual({ backgroundColor: 'rgba(0, 0, 0, 0)', color: 'rgba(0, 0, 0, 0)', letter: '<' });
});

test("Vim mode's messages and prompt hints are in the theme's text colours, and an error leaves the editor focused", async ({ editor, page }) => {
  await startInVimMode(editor, '<p>one</p>');
  const panel = page.locator('source-editor .cm-vim-panel');
  const colour = (locator: typeof panel) => locator.evaluate((element) => getComputedStyle(element).color);

  await page.keyboard.type('yy');
  const message = panel.locator('.cm-vim-message');
  await expect(message).toHaveText('1 lines yanked');
  expect(await colour(message)).toBe(await tokenColour(page, '--fg'));

  await page.keyboard.type(':nonsense');
  await page.keyboard.press('Enter');
  await expect(message).toContainText('Not an editor command');
  expect(await colour(message)).toBe(await tokenColour(page, '--fg'));

  // The editor keeps focus after the error, so Vim's keys still reach it.
  await expect(editor.sourceBox).toBeFocused();
  await page.keyboard.type('/');
  const hint = panel.getByText(/regexp/);
  await expect(hint).toBeVisible();
  expect(await colour(hint)).toBe(await tokenColour(page, '--syntax-comment'));
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`in ${colorScheme} mode`, () => {
    test.use({ colorScheme });
    test("Vim mode's block cursor follows the theme", async ({ editor, page }) => {
      await startInVimMode(editor);
      const background = await page
        .locator('source-editor .cm-fat-cursor')
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      const text = await editor.sourceBox.evaluate((element) => getComputedStyle(element).color);
      expect(background).toBe(text);
    });
  });
}

test('the text size can be stepped up and down, keeping the menu open, and stays as set', async ({ editor, page }) => {
  const menu = page.getByRole('menu', { name: 'Settings' });
  const smaller = page.getByRole('menuitem', { name: 'Smaller text' });
  const larger = page.getByRole('menuitem', { name: 'Larger text' });
  const shown = menu.getByRole('status');
  const fontSize = () => page.locator('source-editor .cm-content').evaluate((element) => getComputedStyle(element).fontSize);
  await expect(editor.sourceBox).toBeVisible();
  await expect.poll(fontSize).toBe('14px');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(shown).toHaveText('14');
  await larger.click();
  await larger.click();
  await expect(menu).toBeVisible();
  await expect(shown).toHaveText('16');
  await expect.poll(fontSize).toBe('16px');
  await smaller.click();
  await expect(shown).toHaveText('15');
  await expect.poll(fontSize).toBe('15px');

  await page.reload();
  await expect(editor.sourceBox).toBeVisible();
  await expect.poll(fontSize).toBe('15px');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(shown).toHaveText('15');

  // It stops at the smallest size.
  for (let size = 15; size > 10; size--) await smaller.click();
  await expect(shown).toHaveText('10');
  await expect(smaller).toHaveAttribute('aria-disabled', 'true');
  await smaller.click({ force: true });
  await expect(shown).toHaveText('10');
  await expect.poll(fontSize).toBe('10px');
  await expect(larger).not.toHaveAttribute('aria-disabled');
});

/** How far each line number is from the line it numbers, in px; 0 when they line up. */
async function lineNumberDrift(page: Page) {
  return page.locator('source-editor').evaluate((editor) => {
    const lines = [...editor.querySelectorAll('.cm-line')];
    // Leaving out the hidden spacer that sets the gutter's width.
    const numbers = [...editor.querySelectorAll<HTMLElement>('.cm-lineNumbers .cm-gutterElement')].filter(
      (element) => element.style.visibility !== 'hidden',
    );
    return Math.max(
      ...lines.map((line, index) =>
        Math.abs(line.getBoundingClientRect().top - numbers[index]!.getBoundingClientRect().top),
      ),
    );
  });
}

test('the line numbers follow the text as its size and font change', async ({ editor, page }) => {
  await editor.setSource(Array.from({ length: 20 }, (_, index) => `<p>${index}</p>`).join('\n'));
  await expect.poll(() => lineNumberDrift(page)).toBeLessThan(1);

  await page.getByRole('button', { name: 'Settings' }).click();
  for (let step = 0; step < 6; step++) await page.getByRole('menuitem', { name: 'Larger text' }).click();
  await expect.poll(() => lineNumberDrift(page)).toBeLessThan(1);
  for (let step = 0; step < 8; step++) await page.getByRole('menuitem', { name: 'Smaller text' }).click();
  await expect.poll(() => lineNumberDrift(page)).toBeLessThan(1);
  await page.getByRole('menuitemcheckbox', { name: 'Use system font' }).click();
  await expect.poll(() => lineNumberDrift(page)).toBeLessThan(1);
});

test("the settings menu's text can't be selected", async ({ editor, page }) => {
  await expect(editor.sourceBox).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  const menu = page.getByRole('menu', { name: 'Settings' });
  for (const text of [menu.getByText('Text size', { exact: true }), menu.getByRole('status')]) {
    await text.dblclick();
    expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');
  }
  // Choosing an item closes the menu, so a double click can't try those; check how they're styled instead.
  for (const text of [menu.getByText('Text size', { exact: true }), menu.getByRole('status'), menu.getByText('Word wrap')]) {
    expect(await text.evaluate((element) => getComputedStyle(element).userSelect)).toBe('none');
  }
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
  await expect(page.getByRole('menuitemcheckbox', { name: 'Vim mode' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Smaller text' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Larger text' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Larger text' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(wordWrap).toBeFocused();
  await page.keyboard.press(' ');
  await expect(menu).toBeHidden();
  await expect(settings).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(wordWrap).not.toBeChecked();
});

test("Vim mode's prompts are in the Source's font, typed just after the prompt, and follow Use system font", async ({
  editor,
  page,
}) => {
  await startInVimMode(editor, '<p>one</p>');
  const input = page.locator('source-editor .cm-vim-panel input');
  const font = (locator: typeof input) => locator.evaluate((element) => getComputedStyle(element).fontFamily);
  const fonts = async () => ({
    prompt: await font(input.locator('..')),
    input: await font(input),
    source: await font(page.locator('source-editor .cm-scroller')),
  });
  /** Where the prompt's `:` or `/` sits, and where the input's text starts after it. */
  const layout = () =>
    input.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element.previousSibling!);
      const prompt = range.getBoundingClientRect();
      const field = element.getBoundingClientRect();
      return { gap: field.left - prompt.right, top: field.top - prompt.top, height: field.height - prompt.height };
    });

  for (const prompt of [':', '/']) {
    await page.keyboard.type(prompt);
    await expect(input).toBeFocused();
    const { source, ...rest } = await fonts();
    expect(source).toMatch(/^"?Cascadia Mono"?,/);
    expect(rest).toEqual({ prompt: source, input: source });
    const { gap, top, height } = await layout();
    expect(Math.abs(gap), 'gap after the prompt').toBeLessThan(0.5);
    expect(Math.abs(top), 'offset from the prompt').toBeLessThan(0.5);
    expect(Math.abs(height), 'height beside the prompt').toBeLessThan(0.5);
    await page.keyboard.press('Escape');
  }

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Use system font' }).click();
  await editor.sourceBox.click();
  await page.keyboard.press('Escape');
  await page.keyboard.type(':');
  await expect.poll(async () => (await fonts()).input).toMatch(/^ui-monospace/);
  const { source, ...rest } = await fonts();
  expect(rest).toEqual({ prompt: source, input: source });
});
