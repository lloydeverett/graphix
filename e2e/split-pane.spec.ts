import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.js';

const divider = (page: Page) => page.getByRole('separator', { name: 'Resize the Source and Preview' });

/** The editor's size along the split: its width side by side, its height stacked. */
async function editorSize(page: Page, axis: 'width' | 'height') {
  const box = await page.locator('source-editor').boundingBox();
  return box![axis];
}

/** The Preview's size along the split. */
async function previewSize(page: Page, axis: 'width' | 'height') {
  const box = await page.locator('preview-pane').boundingBox();
  return box![axis];
}

/** Drags the divider by (dx, dy), starting from its centre. */
async function dragDivider(page: Page, dx: number, dy: number) {
  const box = (await divider(page).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
}

test('splits the Source and Preview evenly at first', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await expect(divider(page)).toHaveAttribute('aria-orientation', 'vertical');
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '50');
});

test('dragging the divider resizes the Source and Preview, even over the Preview', async ({
  editor,
  page,
}) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const before = await editorSize(page, 'width');

  // Ends with the pointer over the Preview's iframe, which mustn't swallow it.
  await dragDivider(page, 200, 0);

  expect(Math.abs((await editorSize(page, 'width')) - before - 200)).toBeLessThan(2);
  expect(Number(await divider(page).getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  // The Preview still works after a drag.
  await editor.setSource('<p>still live</p>');
  await expect(editor.preview.getByText('still live')).toBeVisible();
});

test('keeps both panes usable however far the divider is dragged', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await dragDivider(page, -2000, 0);
  expect(await editorSize(page, 'width')).toBeCloseTo(240, 0);

  await dragDivider(page, 4000, 0);
  expect(await previewSize(page, 'width')).toBeCloseTo(240, 0);
});

test('keeps both panes usable as the window shrinks', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  await dragDivider(page, -2000, 0);

  await page.setViewportSize({ width: 800, height: 720 });
  expect(await editorSize(page, 'width')).toBeCloseTo(240, 0);

  // Too narrow for the minimum, the panes split what there is.
  await page.setViewportSize({ width: 721, height: 720 });
  await dragDivider(page, 4000, 0);
  expect(await editorSize(page, 'width')).toBeGreaterThanOrEqual(240);
  expect(await previewSize(page, 'width')).toBeCloseTo(240, 0);
});

test('resizes from the keyboard', async ({ editor, page }) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const before = await editorSize(page, 'width');

  await divider(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '55');
  expect(await editorSize(page, 'width')).toBeGreaterThan(before);

  await page.keyboard.press('ArrowLeft');
  await expect(divider(page)).toHaveAttribute('aria-valuenow', '50');
});

test.describe('on a narrow screen', () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test('stacks the Source above the Preview, and resizes vertically', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    await expect(divider(page)).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(divider(page)).toHaveAttribute('aria-valuenow', '50');
    const before = await editorSize(page, 'height');

    await dragDivider(page, 0, 100);
    expect(Math.abs((await editorSize(page, 'height')) - before - 100)).toBeLessThan(2);

    await divider(page).focus();
    await page.keyboard.press('ArrowUp');
    expect(await editorSize(page, 'height')).toBeLessThan(before + 100);
  });

  test('keeps both panes usable however far the divider is dragged', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    await dragDivider(page, 0, -2000);
    expect(await editorSize(page, 'height')).toBeCloseTo(120, 0);

    await dragDivider(page, 0, 4000);
    expect(await previewSize(page, 'height')).toBeCloseTo(120, 0);
  });
});

test.describe('on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });

  test('resizes with a finger, from beside the divider line', async ({ editor, page }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    const before = await editorSize(page, 'height');
    const box = (await divider(page).boundingBox())!;
    const x = box.x + box.width / 2;
    // Off the 1px line, but within the wider target touch screens get.
    const y = box.y + 8;

    // Playwright can only tap, so drive the touches through Chromium directly.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', dy: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y: y + dy }],
      });
    await touch('touchStart', 0);
    for (let dy = 10; dy <= 100; dy += 10) await touch('touchMove', dy);
    await touch('touchEnd', 100);

    expect(Math.abs((await editorSize(page, 'height')) - before - 100)).toBeLessThan(2);
  });
});
