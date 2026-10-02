import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './preview-pane.js';

const STORAGE_KEY = 'graphix:source';

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
      display: grid;
      grid-template-columns: 1fr 1fr;
      height: 100vh;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 16px;
      border: none;
      border-right: 1px solid var(--border);
      outline: none;
      resize: none;
      background: var(--surface);
      color: var(--fg);
      font: 14px/1.5 ui-monospace, monospace;
      tab-size: 4;
    }

    @media (max-width: 720px) {
      :host {
        grid-template-columns: 1fr;
        grid-template-rows: 40vh 1fr;
      }

      textarea {
        border-right: none;
        border-bottom: 1px solid var(--border);
      }
    }
  `;

  /** The Source as typed. */
  @state() source = loadSource();

  #onInput(event: InputEvent) {
    this.source = (event.target as HTMLTextAreaElement).value;
    saveSource(this.source);
  }

  render() {
    return html`
      <textarea
        aria-label="HTML source"
        spellcheck="false"
        .value=${this.source}
        @input=${this.#onInput}
      ></textarea>
      <preview-pane .source=${this.source}></preview-pane>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'graphix-app': GraphixApp;
  }
}
