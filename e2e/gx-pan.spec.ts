import { type Editor, expect, test, treeNodeSource } from './fixtures.js';

/** A Source with a heading, then a Pan View holding `inner`. */
const panned = (inner: string, heading = 'Title') =>
  `<h1>${heading}</h1>\n<gx-pan style="height: 240px">\n${inner}\n</gx-pan>`;

/** A Tree too wide for the Preview at its natural size. */
const WIDE_TREE = `<gx-tree-node label="Root">${Array.from({ length: 12 }, (_, i) =>
  treeNodeSource(`Child number ${i + 1}`),
).join('')}</gx-tree-node>`;

const view = (editor: Editor) => editor.preview.locator('gx-pan .view').first();
const content = (editor: Editor) => editor.preview.locator('gx-pan .content').first();

/** The content's pan and zoom: x and y in pixels, and its scale k. */
function transformOf(editor: Editor) {
  return content(editor).evaluate((element) => {
    const matrix = new DOMMatrix(getComputedStyle(element).transform);
    return { x: matrix.e, y: matrix.f, k: matrix.a };
  });
}

async function centreOf(editor: Editor) {
  const box = await view(editor).boundingBox();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

async function drag(editor: Editor, from: { x: number; y: number }, by: { x: number; y: number }) {
  const { mouse } = editor.page;
  await mouse.move(from.x, from.y);
  await mouse.down();
  await mouse.move(from.x + by.x, from.y + by.y, { steps: 5 });
  await mouse.up();
}

/** Waits for the content to be fitted to the view, and returns that fit. */
async function fitted(editor: Editor, expectScale: (k: number) => void) {
  await expect(async () => expectScale((await transformOf(editor)).k)).toPass();
  return transformOf(editor);
}

test('fits wide content into the view', async ({ editor }) => {
  await editor.setSource(panned(WIDE_TREE));
  await fitted(editor, (k) => expect(k).toBeLessThan(1));

  const [viewBox, contentBox] = await Promise.all([view(editor).boundingBox(), content(editor).boundingBox()]);
  expect(contentBox!.x).toBeGreaterThanOrEqual(viewBox!.x - 1);
  expect(contentBox!.x + contentBox!.width).toBeLessThanOrEqual(viewBox!.x + viewBox!.width + 1);
});

test('wraps text at the width of the view', async ({ editor }) => {
  const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
  await editor.setSource(panned(`<p style="margin: 0">${words}</p>`));
  await fitted(editor, (k) => expect(k).toBe(1));

  const [viewBox, paragraphBox] = await Promise.all([
    view(editor).boundingBox(),
    editor.preview.locator('gx-pan p').boundingBox(),
  ]);
  expect(paragraphBox!.width).toBeLessThanOrEqual(viewBox!.width);
  expect(paragraphBox!.height).toBeGreaterThan(40);
});

test('shows a full-width table, as water.css styles it, at its natural size', async ({ editor, page }) => {
  await page.getByRole('combobox', { name: 'Base style' }).selectOption('water.css-light');
  await expect(editor.preview.locator(':root')).toHaveAttribute('data-base-style', 'water.css-light');
  await editor.setSource(panned('<table><tr><th>Name</th><th>Role</th></tr><tr><td>Ada</td><td>Engineer</td></tr></table>'));
  const table = editor.preview.locator('gx-pan table');
  await expect(table).toHaveCSS('table-layout', 'fixed');
  await fitted(editor, (k) => expect(k).toBe(1));

  const [viewBox, tableBox] = await Promise.all([view(editor).boundingBox(), table.boundingBox()]);
  expect(tableBox!.width).toBeLessThanOrEqual(viewBox!.width);
  await expect(editor.preview.getByRole('cell', { name: 'Engineer' })).toBeVisible();
});

test('centres small content at its natural size', async ({ editor }) => {
  await editor.setSource(panned('<p style="margin: 0">small</p>'));
  await fitted(editor, (k) => expect(k).toBe(1));

  const [viewBox, contentBox] = await Promise.all([view(editor).boundingBox(), content(editor).boundingBox()]);
  expect(contentBox!.x + contentBox!.width / 2).toBeCloseTo(viewBox!.x + viewBox!.width / 2, 0);
  expect(contentBox!.y + contentBox!.height / 2).toBeCloseTo(viewBox!.y + viewBox!.height / 2, 0);
});

test('pans by dragging', async ({ editor }) => {
  await editor.setSource(panned(WIDE_TREE));
  const before = await fitted(editor, (k) => expect(k).toBeLessThan(1));

  await drag(editor, await centreOf(editor), { x: 60, y: 40 });
  const after = await transformOf(editor);
  expect(after.x).toBeCloseTo(before.x + 60, 0);
  expect(after.y).toBeCloseTo(before.y + 40, 0);
  expect(after.k).toBe(before.k);
});

test('zooms around the pointer with ctrl-scroll, and leaves a plain scroll to the page', async ({ editor, page }) => {
  await editor.setSource(panned(WIDE_TREE));
  const before = await fitted(editor, (k) => expect(k).toBeLessThan(1));
  const viewBox = (await view(editor).boundingBox())!;
  const pointer = { x: viewBox.x + 100, y: viewBox.y + 80 };
  await page.mouse.move(pointer.x, pointer.y);

  await page.mouse.wheel(0, -200);
  expect(await transformOf(editor)).toEqual(before);

  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -200);
  await page.keyboard.up('Control');
  await expect.poll(async () => (await transformOf(editor)).k).toBeGreaterThan(before.k);

  // The point of the content that was under the pointer stays under it, to
  // within the rounding of the pointer to whole pixels.
  const after = await transformOf(editor);
  // A large scroll zooms in only one step, not many times over.
  expect(after.k).toBeLessThanOrEqual(before.k * Math.SQRT2 * 1.0001);
  const under = { x: (pointer.x - viewBox.x - before.x) / before.k, y: (pointer.y - viewBox.y - before.y) / before.k };
  expect(Math.abs(viewBox.x + after.x + under.x * after.k - pointer.x)).toBeLessThan(2);
  expect(Math.abs(viewBox.y + after.y + under.y * after.k - pointer.y)).toBeLessThan(2);
});

test('follows a link on a click, but not at the end of a drag', async ({ editor }) => {
  await editor.setSource(panned('<p style="margin: 0"><a href="#here">a link</a></p>'));
  await fitted(editor, (k) => expect(k).toBe(1));
  const link = editor.preview.getByRole('link', { name: 'a link' });
  const box = (await link.boundingBox())!;

  await drag(editor, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, { x: 60, y: 0 });
  expect(await editor.inPreview(() => location.hash)).toBe('');

  await link.click();
  await expect.poll(() => editor.inPreview(() => location.hash)).toBe('#here');
});

test('moves nothing on a click that wobbles a little, and keeps fitting', async ({ editor }) => {
  await editor.setSource(panned('<p style="margin: 0"><a href="#here">a link</a></p>'));
  const fit = await fitted(editor, (k) => expect(k).toBe(1));
  const box = (await editor.preview.getByRole('link', { name: 'a link' }).boundingBox())!;
  await editor.mark('gx-pan');

  await drag(editor, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, { x: 2, y: 1 });
  await expect.poll(() => editor.inPreview(() => location.hash)).toBe('#here');
  expect(await transformOf(editor)).toEqual(fit);

  // Not moved by the user, so new content is fitted.
  await editor.setSource(panned(WIDE_TREE));
  await fitted(editor, (k) => expect(k).toBeLessThan(1));
  expect(await editor.isMarked('gx-pan')).toBe(true);
});

test('leaves keys pressed in its content to the content', async ({ editor, page }) => {
  await editor.setSource(panned('<input aria-label="Name">'));
  const fit = await fitted(editor, (k) => expect(k).toBe(1));
  const input = editor.preview.getByRole('textbox', { name: 'Name' });

  await input.click();
  await page.keyboard.type('a+-=0');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('b');
  await expect(input).toHaveValue('a+-=b0');
  expect(await transformOf(editor)).toEqual(fit);
});

test('fits content too big for the zoom limits, and zooms out no further', async ({ editor, page }) => {
  await editor.setSource(panned('<div style="width: 40000px; height: 10px"></div>'));
  const fit = await fitted(editor, (k) => expect(k).toBeLessThan(0.05));

  await view(editor).focus();
  await page.keyboard.press('-');
  expect((await transformOf(editor)).k).toBeCloseTo(fit.k);
  await page.keyboard.press('+');
  await expect.poll(async () => (await transformOf(editor)).k).toBeGreaterThan(fit.k);
});

test('zooms and pans from the keyboard and the buttons', async ({ editor, page }) => {
  await editor.setSource(panned(WIDE_TREE));
  const fit = await fitted(editor, (k) => expect(k).toBeLessThan(1));

  await view(editor).focus();
  await page.keyboard.press('+');
  await expect.poll(async () => (await transformOf(editor)).k).toBeCloseTo(fit.k * 1.25);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await transformOf(editor)).x).toBeLessThan(fit.x);
  await page.keyboard.press('0');
  await expect.poll(() => transformOf(editor)).toEqual(fit);

  await editor.preview.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(async () => (await transformOf(editor)).k).toBeCloseTo(fit.k * 1.25);
  await editor.preview.getByRole('button', { name: 'Zoom out' }).click();
  await expect.poll(async () => (await transformOf(editor)).k).toBeCloseTo(fit.k);
  await drag(editor, await centreOf(editor), { x: 30, y: 0 });
  await editor.preview.getByRole('button', { name: 'Fit' }).click();
  await expect.poll(() => transformOf(editor)).toEqual(fit);
});

test('keeps the pan and zoom through edits, until a Refresh', async ({ editor, page }) => {
  await editor.setSource(panned(WIDE_TREE));
  const fit = await fitted(editor, (k) => expect(k).toBeLessThan(1));
  await drag(editor, await centreOf(editor), { x: 60, y: 40 });
  const moved = await transformOf(editor);
  await editor.mark('gx-pan');

  await editor.setSource(panned(WIDE_TREE, 'Edited'));
  await expect(editor.preview.locator('h1')).toHaveText('Edited');
  expect(await editor.isMarked('gx-pan')).toBe(true);
  expect(await transformOf(editor)).toEqual(moved);

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => transformOf(editor)).toEqual(fit);
});

test('zooming leaves a Tree laid out as it was', async ({ editor }) => {
  await editor.setSource(panned(WIDE_TREE));
  const fit = await fitted(editor, (k) => expect(k).toBeLessThan(1));
  const layout = () =>
    editor.preview
      .locator('gx-tree-node[label="Root"]')
      .evaluate((root) => [root, ...root.children].map((node) => JSON.stringify((node as { position?: unknown }).position)));
  const before = await layout();

  await editor.preview.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(async () => (await transformOf(editor)).k).toBeGreaterThan(fit.k);
  expect(await layout()).toEqual(before);
});
