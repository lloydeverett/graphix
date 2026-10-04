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

    /* Stacked, the Source starts with 40% of the height. */
    split-pane[orientation='vertical'] > source-editor {
      flex-grow: 2;
    }

    split-pane[orientation='vertical'] > preview-pane {
      flex-grow: 3;
    }
  `;

  /** The Source as typed. */
  @state() source = loadSource();

  @state() narrow = narrowScreen.matches;

  #onScreenChange = () => {
    this.narrow = narrowScreen.matches;
  };

  connectedCallback() {
    super.connectedCallback();
    narrowScreen.addEventListener('change', this.#onScreenChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    narrowScreen.removeEventListener('change', this.#onScreenChange);
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
