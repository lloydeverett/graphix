import { expect, test } from './fixtures.js';

test('shows the example Source on first load', async ({ editor }) => {
  await expect(editor.sourceBox).toHaveValue(/Hello, graphix/);
  await expect(editor.preview.getByRole('heading', { name: 'Hello, graphix' })).toBeVisible();
});

test('renders the Source as HTML as you type', async ({ editor }) => {
  await editor.type('<p>hello <strong>world</strong></p>');
  await expect(editor.preview.locator('p strong')).toHaveText('world');
});

test('keeps the Source across a reload', async ({ editor, page }) => {
  await editor.type('<p>saved</p>');
  await expect(editor.preview.getByText('saved')).toBeVisible();
  await page.reload();
  await expect(editor.sourceBox).toHaveValue('<p>saved</p>');
  await expect(editor.preview.getByText('saved')).toBeVisible();
});

test('updates the Preview in place, keeping unchanged nodes', async ({ editor }) => {
  await editor.type('<p id="kept">one</p><p id="changed">two</p>');
  await expect(editor.preview.locator('#changed')).toHaveText('two');
  await editor.inPreview(() => {
    Object.assign(window, { graphixMarker: true });
    Object.assign(document.getElementById('kept')!, { graphixMarker: true });
  });

  await editor.type('<p id="kept">one</p><p id="changed">three</p><p>four</p>');
  await expect(editor.preview.locator('#changed')).toHaveText('three');
  await expect(editor.preview.getByText('four')).toBeVisible();

  const survived = await editor.inPreview(() => ({
    document: 'graphixMarker' in window,
    node: 'graphixMarker' in document.getElementById('kept')!,
  }));
  expect(survived).toEqual({ document: true, node: true });
});

test('removes and reorders nodes', async ({ editor }) => {
  await editor.type('<p>a</p><p>b</p><p>c</p>');
  await expect(editor.preview.locator('p')).toHaveText(['a', 'b', 'c']);
  await editor.type('<p>c</p><p>a</p>');
  await expect(editor.preview.locator('p')).toHaveText(['c', 'a']);
  await editor.type('');
  await expect(editor.preview.locator('p')).toHaveCount(0);
});

test('Refresh rebuilds the Preview from scratch', async ({ editor, page }) => {
  await editor.type('<p>fresh</p>');
  await expect(editor.preview.getByText('fresh')).toBeVisible();
  await editor.inPreview(() => Object.assign(window, { graphixMarker: true }));

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => editor.inPreview(() => 'graphixMarker' in window)).toBe(false);
  await expect(editor.preview.getByText('fresh')).toBeVisible();
});

test.describe('the sandbox', () => {
  test.use({ allowedErrors: [/Content Security Policy/] });

  test('runs no code from the Source', async ({ editor }) => {
    await editor.type(`
      <script>document.body.dataset.ran = 'script'</script>
      <img src="data:," onerror="document.body.dataset.ran = 'onerror'">
      <a href="javascript:document.body.dataset.ran = 'link'">link</a>
      <p>done</p>
    `);
    await expect(editor.preview.getByText('done')).toBeVisible();
    await editor.preview.getByRole('link', { name: 'link' }).click();
    // Give the image's error event, and anything it might run, time to happen.
    await editor.page.waitForTimeout(500);

    expect(await editor.inPreview(() => document.body.querySelectorAll('script').length)).toBe(1);
    expect(await editor.inPreview(() => document.body.dataset.ran ?? null)).toBeNull();
  });

  test("can't reach the editor", async ({ editor }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    const reach = await editor.inPreview(() => {
      try {
        return window.parent.document ? 'reached' : 'blocked';
      } catch {
        return 'blocked';
      }
    });
    expect(reach).toBe('blocked');
    expect(await editor.inPreview(() => origin)).toBe('null');
  });
});
