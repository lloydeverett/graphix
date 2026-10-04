import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.js';

/** The computed colour of the first highlighted token in the Source with exactly `text`. */
function tokenColor(page: Page, text: string) {
  return page
    .locator('source-editor .cm-line span')
    .getByText(text, { exact: true })
    .first()
    .evaluate((element) => getComputedStyle(element).color);
}

type Rgba = [r: number, g: number, b: number, a: number];

function parseColor(color: string): Rgba {
  const [r = 0, g = 0, b = 0, a = 1] = color.match(/[\d.]+/g)!.map(Number);
  return [r, g, b, a];
}

/** Paints each layer over the one before, as the browser does; the first must be opaque. */
function composite(...layers: string[]): Rgba {
  return layers.map(parseColor).reduce((below, above) => {
    const alpha = above[3];
    const mix = (i: number) => below[i]! * (1 - alpha) + above[i]! * alpha;
    return [mix(0), mix(1), mix(2), 1];
  });
}

/** WCAG contrast ratio between two opaque colours. */
function contrast(first: Rgba, second: Rgba) {
  const luminance = ([red, green, blue]: Rgba) => {
    const [r, g, b] = [red, green, blue].map((channel) => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
}

/** Every colour text in the Source can have. */
const TEXT_COLORS = [
  '--fg',
  '--syntax-tag',
  '--syntax-attribute',
  '--syntax-string',
  '--syntax-comment',
  '--syntax-keyword',
  '--error-fg',
];

/** The computed background of the first element in the Source editor matching `selector`. */
function background(page: Page, selector: string) {
  return page
    .locator(`source-editor ${selector}`)
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
}

test('is a CodeMirror editor labelled for assistive technology', async ({ editor }) => {
  await expect(editor.sourceBox).toHaveRole('textbox');
  await expect(editor.sourceBox).toHaveAttribute('contenteditable', 'true');
  await expect(editor.sourceBox).toHaveClass(/cm-content/);
});

test('highlights HTML syntax', async ({ editor, page }) => {
  await editor.setSource('<a href="https://example.com">link</a><!-- note -->');
  const tag = await tokenColor(page, 'a');
  const attribute = await tokenColor(page, 'href');
  const value = await tokenColor(page, '"https://example.com"');
  const comment = await tokenColor(page, '<!-- note -->');
  const text = await editor.sourceBox.evaluate((element) => getComputedStyle(element).color);

  expect(new Set([tag, attribute, value, comment, text]).size).toBe(5);
});

test('changes highlight colours with the theme', async ({ editor, page }) => {
  await expect(editor.sourceBox).toContainText('Hello, graphix');
  const light = await tokenColor(page, 'h1');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => tokenColor(page, 'h1')).not.toBe(light);
});

test('updates the Preview as you type, closing tags for you', async ({ editor, page }) => {
  await editor.setSource('');
  await editor.sourceBox.click();
  await page.keyboard.type('<p>typed');

  await expect(editor.sourceBox).toHaveText('<p>typed</p>');
  await expect(editor.preview.locator('body > p')).toHaveText('typed');
});

test('undoes edits, and the Preview follows', async ({ editor, page }) => {
  await editor.setSource('<p>first</p>');
  await expect(editor.preview.locator('body > p')).toHaveText('first');
  await editor.sourceBox.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type(' second');
  await expect(editor.preview.getByText('second')).toBeVisible();

  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor.sourceBox).toHaveText('<p>first</p>');
  await expect(editor.preview.getByText('second')).toHaveCount(0);
});

test('reports only edits made in the editor, not a value set from outside', async ({ editor, page }) => {
  const sourceEditor = page.locator('source-editor');
  await sourceEditor.evaluate((element) => {
    Object.assign(window, { graphixInputs: 0 });
    element.addEventListener('source-input', () => {
      (window as unknown as { graphixInputs: number }).graphixInputs++;
    });
  });
  const inputs = () => page.evaluate(() => (window as unknown as { graphixInputs: number }).graphixInputs);

  await sourceEditor.evaluate((element) => {
    (element as HTMLElement & { value: string }).value = '<p>from outside</p>';
  });
  await expect(editor.sourceBox).toHaveText('<p>from outside</p>');
  expect(await inputs()).toBe(0);

  await editor.sourceBox.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type('!');
  await expect.poll(inputs).toBe(1);
});


for (const colorScheme of ['light', 'dark'] as const) {
  test(`keeps text readable on every highlight in the ${colorScheme} theme`, async ({ editor, page }) => {
    await page.emulateMedia({ colorScheme });
    await editor.setSource('<p>word</p>\n<p>word</p>');
    const textColors = await page.evaluate(
      (names) =>
        names.map((name) => {
          const probe = document.body.appendChild(document.createElement('span'));
          probe.style.color = `var(${name})`;
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        }),
      TEXT_COLORS,
    );

    // Selects the first `word`, which highlights the second as a match.
    await page.locator('source-editor .cm-line').first().getByText('word').dblclick();
    const surface = await background(page, '.cm-editor');
    const activeLine = await background(page, '.cm-activeLine');
    const selection = await background(page, '.cm-selectionBackground');
    const selectionMatch = await background(page, '.cm-selectionMatch');
    await editor.sourceBox.blur();
    const unfocusedSelection = await background(page, '.cm-selectionBackground');

    await editor.sourceBox.click();
    await page.keyboard.press('ControlOrMeta+f');
    await page.keyboard.type('word');
    await page.keyboard.press('Enter');
    await expect(page.locator('source-editor .cm-searchMatch-selected')).toHaveCount(1);
    const searchMatch = await background(page, '.cm-searchMatch:not(.cm-searchMatch-selected)');
    const selectedSearchMatch = await background(page, '.cm-searchMatch-selected');

    // The selection layer lies under the lines, and marks on text lie over them.
    const highlights: Record<string, Rgba> = {
      selection: composite(surface, selection),
      'selection on the active line': composite(surface, selection, activeLine),
      'unfocused selection on the active line': composite(surface, unfocusedSelection, activeLine),
      'selection match': composite(surface, selectionMatch),
      'selection match on the active line': composite(surface, activeLine, selectionMatch),
      'search match': composite(surface, searchMatch),
      'search match on the active line': composite(surface, activeLine, searchMatch),
      'selected search match': composite(surface, selection, activeLine, selectedSearchMatch),
    };
    for (const [name, highlight] of Object.entries(highlights)) {
      for (const [i, color] of textColors.entries()) {
        const ratio = contrast(parseColor(color), highlight);
        expect(ratio, `${TEXT_COLORS[i]} on ${name}`).toBeGreaterThanOrEqual(4.5);
      }
    }

    // And each highlight shows against what's beneath it.
    const plain = composite(surface);
    const visible: [string, Rgba, Rgba][] = [
      ['selection', highlights.selection!, plain],
      ['selection on the active line', highlights['selection on the active line']!, composite(surface, activeLine)],
      ['selection match', highlights['selection match']!, plain],
      ['search match', highlights['search match']!, plain],
    ];
    for (const [name, highlight, beneath] of visible) {
      expect(contrast(highlight, beneath), `${name} shows`).toBeGreaterThanOrEqual(1.15);
    }
  });
}
