import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './preview-pane.js';
// Parcel drops a type-only import entirely, so import for the side effect too.
import './source-editor.js';
import './split-pane.js';
import type { SourceEditor } from './source-editor.js';

const STORAGE_KEY = 'graphix:source';

/** Below this width the Source is stacked above the Preview. */
const narrowScreen = matchMedia('(max-width: 720px)');

const EXAMPLE_SOURCE = `<h1>Hello, graphix</h1>
<p>Write HTML on the left. Wrap Mermaid in <code>&lt;gx-mermaid&gt;</code> to draw a diagram.</p>

<gx-mermaid>
  flowchart LR
    A[Type HTML on the left] --> B[Preview updates]
    B --> C{gx-mermaid?}
    C -- yes --> D[Diagram drawn]
</gx-mermaid>
`;

function loadSource(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? EXAMPLE_SOURCE;
  } catch {
    return EXAMPLE_SOURCE;
  }
}

function saveSource(source: string) {
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    // Storage unavailable (e.g. private mode); the Source just won't persist.
  }
}

@customElement('graphix-app')
export class GraphixApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      /* Fixed, so it can follow the visible area; see #fitToVisibleArea. */
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      /* On mobile, vh counts the space behind the browser's toolbars; dvh doesn't. */
      height: 100vh;
      height: 100dvh;
    }

    split-pane {
      height: 100%;
      --split-divider-color: var(--border);
      --split-divider-active-color: var(--syntax-attribute);
    }

    source-editor {
      display: block;
    }
  `;

  /** The Source as typed. */
  @state() source = loadSource();

  /** Whether the screen is narrow enough to stack the Source above the Preview. */
  @state() narrow = narrowScreen.matches;

  #onScreenChange = () => {
    this.narrow = narrowScreen.matches;
  };

  /**
   * iOS doesn't resize the page for its on-screen keyboard: the keyboard covers
   * the page, and Safari slides the whole page up to keep the cursor in view.
   * So fit the app to the part that's visible and keep it there, and only the
   * panes scroll. Zoomed in, the app keeps its size, so zooming still works.
   */
  #fitToVisibleArea = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const zoomed = Math.abs(viewport.scale - 1) > 0.01;
    this.style.height = zoomed ? '' : `${viewport.height}px`;
    this.style.transform = zoomed ? '' : `translateY(${viewport.offsetTop}px)`;
  };

  connectedCallback() {
    super.connectedCallback();
    narrowScreen.addEventListener('change', this.#onScreenChange);
    window.visualViewport?.addEventListener('resize', this.#fitToVisibleArea);
    window.visualViewport?.addEventListener('scroll', this.#fitToVisibleArea);
    this.#fitToVisibleArea();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    narrowScreen.removeEventListener('change', this.#onScreenChange);
    window.visualViewport?.removeEventListener('resize', this.#fitToVisibleArea);
    window.visualViewport?.removeEventListener('scroll', this.#fitToVisibleArea);
  }

  #onInput(event: Event) {
    this.source = (event.target as SourceEditor).value;
    saveSource(this.source);
  }

  render() {
    return html`
      <split-pane orientation=${this.narrow ? 'vertical' : 'horizontal'}>
        <source-editor .value=${this.source} @source-input=${this.#onInput}></source-editor>
        <split-divider aria-label="Resize the Source and Preview"></split-divider>
        <preview-pane .source=${this.source}></preview-pane>
      </split-pane>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'graphix-app': GraphixApp;
  }
}
