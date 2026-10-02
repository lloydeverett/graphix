import { type FrameLocator, type Page, test as base, expect } from '@playwright/test';

type Fixtures = {
  /** Console errors a test expects; any other error, from any frame, fails it. */
  allowedErrors: RegExp[];
  /** The editor, opened with no saved Source. */
  editor: Editor;
};

export class Editor {
  constructor(readonly page: Page) {}

  get sourceBox() {
    return this.page.getByLabel('HTML source');
  }

  /** The Preview iframe's document. */
  get preview(): FrameLocator {
    return this.page.frameLocator('iframe[title="Preview"]');
  }

  async type(source: string) {
    await this.sourceBox.fill(source);
  }

  /** Runs `fn` inside the current Preview iframe. */
  async inPreview<T>(fn: () => T | Promise<T>): Promise<T> {
    const handle = await this.page.locator('iframe[title="Preview"]').elementHandle();
    const frame = await handle!.contentFrame();
    return frame!.evaluate(fn);
  }
}

export const test = base.extend<Fixtures>({
  allowedErrors: [[], { option: true }],

  page: async ({ page, allowedErrors }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (!allowedErrors.some((pattern) => pattern.test(text))) errors.push(text);
    });
    await use(page);
    expect(errors, 'unexpected console errors').toEqual([]);
  },

  editor: async ({ page }, use) => {
    await page.goto('/');
    await use(new Editor(page));
  },
});

export { expect };
