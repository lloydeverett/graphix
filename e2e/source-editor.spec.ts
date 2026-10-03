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
