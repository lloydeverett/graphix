import type { BrowserContext } from '@playwright/test';
import { expect, test } from './fixtures.js';

/**
 * Opens the editor in a new tab, and gathers the font files the editor and
 * the Preview request, named by the font's folder in `src/fonts/` (as `lato`,
 * `cascadia-code`). A new tab, not a reload: reloading, Chrome may fetch the
 * fonts the page used last time before the page asks for any.
 */
async function openEditor(context: BrowserContext, url: string) {
  const page = await context.newPage();
  const requested = { editor: new Set<string>(), preview: new Set<string>() };
  page.on('request', (request) => {
    if (request.resourceType() !== 'font') return;
    const font = new URL(request.url()).pathname.match(/([a-z]+(?:-[a-z]+)?)-(?:normal|italic)-/)?.[1];
    if (font) requested[request.frame() === page.mainFrame() ? 'editor' : 'preview'].add(font);
  });
  await page.goto(url);
  const preview = page.frameLocator('iframe[title="Preview"]');
  /** Waits until the editor and the Preview show their text, and have loaded the fonts it needs. */
  const settle = async () => {
    await expect(page.locator('source-editor .cm-content')).toBeVisible();
    await expect(preview.locator('h1')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await preview.locator('html').evaluate(() => document.fonts.ready);
  };
  await settle();
  const fonts = (from: 'editor' | 'preview') => () => [...requested[from]].sort();
  return { page, settle, fonts };
}

test('only the fonts in use are downloaded, by the editor and the Preview', async ({ editor, page, context }) => {
  await expect(editor.sourceBox).toBeVisible();
  const opened = await openEditor(context, page.url());
  expect(opened.fonts('editor')()).toEqual(['cascadia-code', 'inter']);
  expect(opened.fonts('preview')()).toEqual(['lato']);

  // Each other font only once it's chosen.
  await opened.page.getByRole('button', { name: 'Settings', exact: true }).click();
  await opened.page.getByRole('menuitemradio', { name: 'Fira Code' }).click();
  await opened.page.getByRole('button', { name: 'Preview settings' }).click();
  await opened.page.getByRole('menuitemradio', { name: 'Inter' }).click();
  await opened.settle();
  await expect.poll(opened.fonts('editor')).toEqual(['cascadia-code', 'fira-code', 'inter']);
  await expect.poll(opened.fonts('preview')).toEqual(['inter', 'lato']);
  await opened.page.close();

  // With System Mono and System, neither downloads any of its own.
  await page.evaluate(() => {
    localStorage.setItem('graphix:editor-font', 'system-mono');
    localStorage.setItem('graphix:preview-font', 'system');
  });
  const system = await openEditor(context, page.url());
  expect(system.fonts('editor')()).toEqual(['inter']);
  expect(system.fonts('preview')()).toEqual([]);
});
