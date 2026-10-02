import { expect, test } from './fixtures.js';

const diagram = (text: string) => `<gx-mermaid>\n${text}\n</gx-mermaid>`;

test('draws the example Diagram', async ({ editor }) => {
  await expect(editor.diagram).toContainText('Diagram drawn');
});

test('draws indented Mermaid with escaped HTML in it', async ({ editor }) => {
  await editor.setSource(diagram('    flowchart LR\n      A[one&lt;br&gt;two] --> B[x &amp; y]'));
  await expect(editor.diagram).toContainText('one');
  await expect(editor.diagram).toContainText('x & y');
  await expect(editor.preview.getByRole('alert')).toHaveCount(0);
});

test('shows a Render Error and keeps the last good drawing', async ({ editor }) => {
  await editor.setSource(diagram('flowchart LR\n  A[good] --> B'));
  await expect(editor.diagram).toContainText('good');

  await editor.setSource(diagram('flowchart LR\n  A[good] -->'));
  await expect(editor.preview.getByRole('alert')).toBeVisible();
  await expect(editor.diagram).toContainText('good');

  await editor.setSource(diagram('flowchart LR\n  A[fixed] --> B'));
  await expect(editor.preview.getByRole('alert')).toHaveCount(0);
  await expect(editor.diagram).toContainText('fixed');
});

test('keeps a Diagram when the HTML around it changes', async ({ editor }) => {
  const body = diagram('flowchart LR\n  A[kept] --> B');
  await editor.setSource(`<h1>before</h1>${body}`);
  await expect(editor.diagram).toContainText('kept');
  await editor.mark('gx-mermaid');

  await editor.setSource(`<h1>after</h1>${body}`);
  await expect(editor.preview.locator('h1')).toHaveText('after');
  expect(await editor.isMarked('gx-mermaid')).toBe(true);
});

test('redraws in the dark theme', async ({ editor, page }) => {
  const node = editor.diagram.locator('.node rect').first();
  const fill = () => node.evaluate((element) => getComputedStyle(element).fill);
  await expect(editor.diagram).toContainText('Diagram drawn');
  const light = await fill();

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(fill).not.toBe(light);
  await expect(editor.diagram).toContainText('Diagram drawn');
});
