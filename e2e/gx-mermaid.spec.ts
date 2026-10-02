import { expect, test } from './fixtures.js';

const diagram = (text: string) => `<gx-mermaid>\n${text}\n</gx-mermaid>`;

test('draws the example Diagram', async ({ editor }) => {
  await expect(editor.preview.locator('gx-mermaid .diagram > svg')).toContainText('Diagram drawn');
});

test('draws indented Mermaid with escaped HTML in it', async ({ editor }) => {
  await editor.type(diagram('    flowchart LR\n      A[one&lt;br&gt;two] --> B[x &amp; y]'));
  const svg = editor.preview.locator('gx-mermaid .diagram > svg');
  await expect(svg).toContainText('one');
  await expect(svg).toContainText('x & y');
  await expect(editor.preview.getByRole('alert')).toHaveCount(0);
});

test('shows a Render Error and keeps the last good drawing', async ({ editor }) => {
  await editor.type(diagram('flowchart LR\n  A[good] --> B'));
  const svg = editor.preview.locator('gx-mermaid .diagram > svg');
  await expect(svg).toContainText('good');

  await editor.type(diagram('flowchart LR\n  A[good] -->'));
  await expect(editor.preview.getByRole('alert')).toBeVisible();
  await expect(svg).toContainText('good');

  await editor.type(diagram('flowchart LR\n  A[fixed] --> B'));
  await expect(editor.preview.getByRole('alert')).toHaveCount(0);
  await expect(svg).toContainText('fixed');
});

test('keeps a Diagram when the HTML around it changes', async ({ editor }) => {
  const body = diagram('flowchart LR\n  A[kept] --> B');
  await editor.type(`<h1>before</h1>${body}`);
  await expect(editor.preview.locator('gx-mermaid .diagram > svg')).toContainText('kept');
  await editor.inPreview(() => {
    Object.assign(document.querySelector('gx-mermaid')!, { graphixMarker: true });
  });

  await editor.type(`<h1>after</h1>${body}`);
  await expect(editor.preview.locator('h1')).toHaveText('after');
  expect(await editor.inPreview(() => 'graphixMarker' in document.querySelector('gx-mermaid')!)).toBe(true);
});

test('redraws in the dark theme', async ({ editor, page }) => {
  const svg = editor.preview.locator('gx-mermaid .diagram > svg');
  await expect(svg).toContainText('Diagram drawn');
  const light = await svg.innerHTML();

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => svg.innerHTML()).not.toBe(light);
  await expect(svg).toContainText('Diagram drawn');
});
