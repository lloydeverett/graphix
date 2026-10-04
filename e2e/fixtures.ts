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

  /** The drawing of the Preview's only Diagram. */
  get diagram() {
    return this.preview.locator('gx-mermaid .diagram > svg');
  }

  /** Replaces the whole Source at once. */
  async setSource(source: string) {
    await this.sourceBox.fill(source);
  }

  /** Runs `fn` inside the current Preview iframe, retrying if a Refresh swaps it. */
  async inPreview<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.preview.locator(':root').evaluate(fn);
  }

  /** Tags the Preview element at `selector`, so a test can tell if it's replaced. */
  async mark(selector: string) {
    await this.preview.locator(selector).evaluate((element) => {
      Object.assign(element, { graphixMarker: true });
    });
  }

  async isMarked(selector: string) {
    return this.preview.locator(selector).evaluate((element) => 'graphixMarker' in element);
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
    // Relative, so a baseURL with a subpath keeps it.
    await page.goto('./');
    await use(new Editor(page));
  },
});

export { expect };
