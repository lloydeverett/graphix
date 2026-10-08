import { type Editor, expect, test } from './fixtures.js';

/** A Slide Deck holding a Slide for each of `slides`. */
const deck = (slides: string[]) =>
  `<gx-slides>\n${slides.map((slide) => `  <gx-slide>${slide}</gx-slide>\n`).join('')}</gx-slides>`;

const THREE_SLIDES = ['<h1>One</h1>', '<h1>Two</h1>', '<h1>Three</h1>'];

const counter = (editor: Editor) => editor.preview.locator('gx-slides .counter');
const previous = (editor: Editor) => editor.preview.getByRole('button', { name: 'Previous slide' });
const next = (editor: Editor) => editor.preview.getByRole('button', { name: 'Next slide' });
const heading = (editor: Editor, name: string) => editor.preview.getByRole('heading', { name });

async function expectOnSlide(editor: Editor, name: string, position: string) {
  await expect(heading(editor, name)).toBeVisible();
  await expect(editor.preview.getByRole('heading')).toHaveCount(1);
  await expect(counter(editor)).toHaveText(position);
}

test('shows the first Slide alone, and moves between them with the buttons', async ({ editor }) => {
  await editor.setSource(deck(THREE_SLIDES));
  await expectOnSlide(editor, 'One', '1 / 3');
  await expect(previous(editor)).toBeDisabled();

  await next(editor).click();
  await expectOnSlide(editor, 'Two', '2 / 3');
  await next(editor).click();
  await expectOnSlide(editor, 'Three', '3 / 3');
  await expect(next(editor)).toBeDisabled();

  await previous(editor).click();
  await expectOnSlide(editor, 'Two', '2 / 3');
});

test('moves between Slides with the arrow keys, Home and End', async ({ editor, page }) => {
  await editor.setSource(deck(THREE_SLIDES));
  await heading(editor, 'One').click();

  await page.keyboard.press('ArrowRight');
  await expectOnSlide(editor, 'Two', '2 / 3');
  await page.keyboard.press('End');
  await expectOnSlide(editor, 'Three', '3 / 3');
  await page.keyboard.press('ArrowRight');
  await expectOnSlide(editor, 'Three', '3 / 3');
  await page.keyboard.press('ArrowLeft');
  await expectOnSlide(editor, 'Two', '2 / 3');
  await page.keyboard.press('Home');
  await expectOnSlide(editor, 'One', '1 / 3');
});

test('keeps the keys working from the buttons, and when one is disabled at either end', async ({ editor, page }) => {
  await editor.setSource(deck(THREE_SLIDES));
  await next(editor).click();
  await expectOnSlide(editor, 'Two', '2 / 3');

  await page.keyboard.press('ArrowRight');
  await expectOnSlide(editor, 'Three', '3 / 3');
  await expect(next(editor)).toBeDisabled();
  await page.keyboard.press('ArrowLeft');
  await expectOnSlide(editor, 'Two', '2 / 3');

  await previous(editor).click();
  await expectOnSlide(editor, 'One', '1 / 3');
  await expect(previous(editor)).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expectOnSlide(editor, 'Two', '2 / 3');
});

test('ignores the arrow keys with ctrl, ⌘ or alt held', async ({ editor, page }) => {
  await editor.setSource(deck(THREE_SLIDES));
  await heading(editor, 'One').click();
  for (const modifier of ['Control', 'Meta', 'Alt']) await page.keyboard.press(`${modifier}+ArrowRight`);
  await expectOnSlide(editor, 'One', '1 / 3');
});

test('leaves the arrow keys to a Pan View in a Slide', async ({ editor, page }) => {
  await editor.setSource(deck(['<h1>One</h1><gx-pan style="height: 120px"><p>panned</p></gx-pan>', '<h1>Two</h1>']));
  await editor.preview.locator('gx-pan .view').focus();
  await page.keyboard.press('ArrowRight');
  await expect(editor.preview.locator('gx-pan .content')).not.toHaveCSS('transform', 'none');
  await expectOnSlide(editor, 'One', '1 / 2');
});

test('leaves the arrow keys to a field in a Slide', async ({ editor, page }) => {
  await editor.setSource(deck(['<h1>One</h1><input aria-label="Name" value="text">', '<h1>Two</h1>']));
  await editor.preview.getByRole('textbox', { name: 'Name' }).click();
  await page.keyboard.press('ArrowRight');
  await expectOnSlide(editor, 'One', '1 / 2');
});

test('stays on its Slide through edits, and within the Slides left', async ({ editor }) => {
  await editor.setSource(deck(THREE_SLIDES));
  await next(editor).click();
  await next(editor).click();
  await expectOnSlide(editor, 'Three', '3 / 3');
  await editor.mark('gx-slides');

  await editor.setSource(deck(['<h1>One</h1>', '<h1>Two</h1>', '<h1>Three, edited</h1>']));
  await expectOnSlide(editor, 'Three, edited', '3 / 3');

  await editor.setSource(deck(['<h1>One</h1>', '<h1>Two</h1>']));
  await expectOnSlide(editor, 'Two', '2 / 2');
  await expect(next(editor)).toBeDisabled();
  expect(await editor.isMarked('gx-slides')).toBe(true);
});

test('follows its Slide when Slides before it are added or removed', async ({ editor }) => {
  await editor.setSource(deck(THREE_SLIDES));
  await next(editor).click();
  await expectOnSlide(editor, 'Two', '2 / 3');

  await editor.setSource(deck(['<h1>Zero</h1>', ...THREE_SLIDES]));
  await expectOnSlide(editor, 'Two', '3 / 4');

  await editor.setSource(deck(THREE_SLIDES.slice(1)));
  await expectOnSlide(editor, 'Two', '1 / 2');
});

test('is 16:9 unless given a height', async ({ editor }) => {
  await editor.setSource(deck(THREE_SLIDES));
  const box = (await editor.preview.locator('gx-slides').boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
});

test('draws a Diagram on a Slide shown later', async ({ editor }) => {
  await editor.setSource(deck(['<h1>One</h1>', '<gx-mermaid>\nflowchart LR\n  A[on slide two] --> B\n</gx-mermaid>']));
  await expect(counter(editor)).toHaveText('1 / 2');
  await next(editor).click();
  await expect(editor.diagram).toContainText('on slide two');
  await expect(editor.diagram).toBeVisible();
});
