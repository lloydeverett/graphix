import { type Editor, expect, test } from './fixtures.js';

const previewSize = (editor: Editor) => editor.inPreview(() => ({ width: innerWidth, height: innerHeight }));

/** The box of the Preview element at `selector`, in the Preview's own coordinates. */
const boxOf = (editor: Editor, selector: string) =>
  editor.preview.locator(selector).evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });

test('covers the whole page, over everything else, in its background colour', async ({ editor }) => {
  await editor.setSource(
    '<h1>Under</h1><p style="position: relative; z-index: 10">Also under</p><div class="gx-fullscreen">Over</div>',
  );
  await expect(editor.preview.getByText('Over')).toBeVisible();
  const { width, height } = await previewSize(editor);
  expect(await boxOf(editor, '.gx-fullscreen')).toEqual({ x: 0, y: 0, width, height });

  // Whatever was under it is hidden: the element at its centre is it.
  const onTop = await editor.inPreview(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.className);
  expect(onTop).toBe('gx-fullscreen');

  // The page's colour, laid over the canvas: water.css-light's is #fff, and
  // water.css-dark's #202b38.
  const fullscreen = editor.preview.locator('.gx-fullscreen');
  await expect(fullscreen).toHaveCSS('background-image', /rgb\(255, 255, 255\)/);
  await editor.chooseBaseStyle('water.css-dark');
  await expect(fullscreen).toHaveCSS('background-image', /rgb\(32, 43, 56\)/);

  // The page underneath doesn't scroll.
  await expect(editor.preview.locator(':root')).toHaveCSS('overflow-y', 'hidden');
});

test('takes away a Pan View or Slide Deck border and size', async ({ editor }) => {
  await editor.setSource(
    '<gx-slides class="gx-fullscreen" style="height: 100px"><gx-slide><p>Slide</p></gx-slide></gx-slides>',
  );
  await expect(editor.preview.getByText('Slide')).toBeVisible();
  const { width, height } = await previewSize(editor);
  expect(await boxOf(editor, 'gx-slides')).toEqual({ x: 0, y: 0, width, height });
  const slides = editor.preview.locator('gx-slides');
  await expect(slides).toHaveCSS('border-top-style', 'none');
  await expect(slides).toHaveCSS('outline-style', 'none');

  await editor.setSource('<gx-pan class="gx-fullscreen"><p>Panned</p></gx-pan>');
  await expect(editor.preview.getByText('Panned')).toBeVisible();
  expect(await boxOf(editor, 'gx-pan')).toEqual({ x: 0, y: 0, width, height });
  await expect(editor.preview.locator('gx-pan')).toHaveCSS('border-top-style', 'none');
});

test("the Source's own background wins", async ({ editor }) => {
  await editor.setSource('<style>.gx-fullscreen { background: rgb(1, 2, 3) }</style><div class="gx-fullscreen">Over</div>');
  await expect(editor.preview.locator('.gx-fullscreen')).toHaveCSS('background-color', 'rgb(1, 2, 3)');
});

test('hides everything underneath, even where the page background is see-through', async ({ editor }) => {
  await editor.setSource(
    '<style>body { background: rgba(0, 0, 0, 0.5) }</style><h1>Under</h1><div class="gx-fullscreen">Over</div>',
  );
  const fullscreen = editor.preview.locator('.gx-fullscreen');
  await expect(fullscreen).toHaveCSS('background-image', /rgba\(0, 0, 0, 0\.5\)/);
  // Under it, the opaque canvas, as under the page.
  const color = await fullscreen.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(color).toMatch(/^rgb\(/);
});

test('scrolls content too big for the page', async ({ editor }) => {
  await editor.setSource('<div class="gx-fullscreen"><p style="height: 3000px">Tall</p><p>End</p></div>');
  const fullscreen = editor.preview.locator('.gx-fullscreen');
  await expect(fullscreen).toHaveCSS('overflow-y', 'auto');
  await editor.preview.getByText('End').scrollIntoViewIfNeeded();
  expect(await fullscreen.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(editor.preview.getByText('End')).toBeInViewport();
});
