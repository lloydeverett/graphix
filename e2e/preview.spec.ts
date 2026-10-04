import { type Editor, expect, test } from './fixtures.js';

test('shows the example Source on first load', async ({ editor }) => {
  await expect(editor.sourceBox).toContainText('Hello, graphix');
  await expect(editor.preview.getByRole('heading', { name: 'Hello, graphix' })).toBeVisible();
});

test('updates the Preview as you type', async ({ editor }) => {
  await editor.setSource('<p>hello <strong>world</strong></p>');
  await expect(editor.preview.locator('p strong')).toHaveText('world');
});

test('keeps the Source when the page is opened again', async ({ editor, page }) => {
  await editor.setSource('<p>saved</p>');
  await expect(editor.preview.getByText('saved')).toBeVisible();
  await page.reload();
  await expect(editor.sourceBox).toHaveText('<p>saved</p>');
  await expect(editor.preview.getByText('saved')).toBeVisible();
});

test('updates the Preview in place, keeping unchanged nodes', async ({ editor }) => {
  await editor.setSource('<p id="kept">one</p><p id="changed">two</p>');
  await expect(editor.preview.locator('#changed')).toHaveText('two');
  await editor.mark(':root');
  await editor.mark('#kept');

  await editor.setSource('<p id="kept">one</p><p id="changed">three</p><p>four</p>');
  await expect(editor.preview.locator('#changed')).toHaveText('three');
  await expect(editor.preview.getByText('four')).toBeVisible();
  expect(await editor.isMarked(':root')).toBe(true);
  expect(await editor.isMarked('#kept')).toBe(true);
});

test('removes and reorders nodes', async ({ editor }) => {
  await editor.setSource('<p>a</p><p>b</p><p>c</p>');
  await expect(editor.preview.locator('p')).toHaveText(['a', 'b', 'c']);
  await editor.setSource('<p>c</p><p>a</p>');
  await expect(editor.preview.locator('p')).toHaveText(['c', 'a']);
  await editor.setSource('');
  await expect(editor.preview.locator('p')).toHaveCount(0);
});

test('Refresh rebuilds the Preview from scratch', async ({ editor, page }) => {
  await editor.setSource('<p>fresh</p>');
  await expect(editor.preview.getByText('fresh')).toBeVisible();
  await editor.mark(':root');

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect.poll(() => editor.isMarked(':root')).toBe(false);
  await expect(editor.preview.getByText('fresh')).toBeVisible();
});

test("the Preview can't reach the editor, unless built same-origin", async ({ editor }, testInfo) => {
  await expect(editor.preview.locator('h1')).toBeVisible();
  const reach = await editor.inPreview(() => {
    try {
      return window.parent.document ? 'reached' : 'blocked';
    } catch {
      return 'blocked';
    }
  });
  const sameOrigin = testInfo.project.name === 'same-origin';
  expect(reach).toBe(sameOrigin ? 'reached' : 'blocked');
  expect(await editor.inPreview(() => origin)).toBe(sameOrigin ? new URL(editor.page.url()).origin : 'null');
});

/** Starts recording the CSP directives the Preview's current document enforces. */
async function recordViolations(editor: Editor) {
  await editor.inPreview(() => {
    const violations: string[] = [];
    Object.assign(window, { graphixViolations: violations });
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(event.effectiveDirective);
    });
  });
  return () =>
    editor.inPreview(() => (window as unknown as { graphixViolations: string[] }).graphixViolations);
}

test.describe('code in the Source', () => {
  test.use({ allowedErrors: [/Content Security Policy/] });

  test('is blocked', async ({ editor }) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    const violations = await recordViolations(editor);

    await editor.setSource(`
      <script>document.body.dataset.ran = 'script'</script>
      <img src="data:," onerror="document.body.dataset.ran = 'onerror'">
      <a href="javascript:document.body.dataset.ran = 'link'">link</a>
      <object data="data:text/html,plugin"></object>
    `);
    await editor.preview.getByRole('link', { name: 'link' }).click();

    // Each blocked attempt reports its violation; wait for all three.
    await expect
      .poll(async () => [...new Set(await violations())].sort())
      .toEqual(['object-src', 'script-src-attr', 'script-src-elem']);
    // The <script> was parsed as already started, so it never even tries to run.
    expect(await editor.inPreview(() => document.body.querySelectorAll('script').length)).toBe(1);
    expect(await editor.inPreview(() => document.body.dataset.ran ?? null)).toBeNull();
  });

  test('may use eval only in dev, for hot reloading', async ({ editor }, testInfo) => {
    await expect(editor.preview.locator('h1')).toBeVisible();
    // Code Playwright evaluates directly may eval regardless of the CSP, so
    // try from a task of the page's own.
    const evalWorks = await editor.inPreview(
      () =>
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            try {
              resolve(new Function('return true')());
            } catch {
              resolve(false);
            }
          });
        }),
    );
    expect(evalWorks).toBe(testInfo.project.name === 'dev');
  });
});
