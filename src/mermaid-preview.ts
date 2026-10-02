import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import mermaid from 'mermaid';

const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

let renderCount = 0;

/**
 * Renders a Source as a Preview. On a Render Error the Preview keeps the last
 * diagram that rendered successfully and shows the error above it.
 */
@customElement('mermaid-preview')
export class MermaidPreview extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: auto;
    }

    .error {
      margin: 0 0 12px;
      padding: 8px 12px;
      border: 1px solid var(--error-border);
      border-radius: 6px;
      background: var(--error-bg);
      color: var(--error-fg);
      font: 13px/1.4 ui-monospace, monospace;
      white-space: pre-wrap;
    }

    .diagram {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .diagram svg {
      max-width: 100%;
      height: auto;
    }
  `;

  @property() source = '';

  @state() svg = '';
  @state() renderError = '';

  #latestRender = 0;

  connectedCallback() {
    super.connectedCallback();
    darkScheme.addEventListener('change', this.#onSchemeChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    darkScheme.removeEventListener('change', this.#onSchemeChange);
  }

  #onSchemeChange = () => {
    void this.#render();
  };

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('source')) void this.#render();
  }

  async #render() {
    const render = ++this.#latestRender;
    const source = this.source;

    if (source.trim() === '') {
      this.svg = '';
      this.renderError = '';
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: darkScheme.matches ? 'dark' : 'default',
    });

    try {
      const { svg } = await mermaid.render(`graphix-${++renderCount}`, source);
      if (render !== this.#latestRender) return;
      this.svg = svg;
      this.renderError = '';
    } catch (error) {
      if (render !== this.#latestRender) return;
      this.renderError = error instanceof Error ? error.message : String(error);
    }
  }

  render() {
    return html`
      ${this.renderError
        ? html`<pre class="error" role="alert">${this.renderError}</pre>`
        : nothing}
      <div class="diagram">${unsafeSVG(this.svg)}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mermaid-preview': MermaidPreview;
  }
}
