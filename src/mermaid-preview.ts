import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import mermaid from 'mermaid';

const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

type Theme = 'default' | 'dark';

function currentTheme(): Theme {
  return darkScheme.matches ? 'dark' : 'default';
}

function configureMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: currentTheme(),
  });
}

configureMermaid();

type RenderResult = { svg: string } | { error: string };

let nextDiagramId = 0;

async function renderDiagram(source: string): Promise<RenderResult> {
  try {
    const { svg } = await mermaid.render(`graphix-${++nextDiagramId}`, source);
    return { svg };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

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

  /** Results of any render older than this are stale and dropped. */
  #latestRenderId = 0;

  /** The Source behind the current Preview, and the theme it was drawn in. */
  #lastGoodSource = '';
  #lastGoodTheme = currentTheme();

  connectedCallback() {
    super.connectedCallback();
    darkScheme.addEventListener('change', this.#onSchemeChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    darkScheme.removeEventListener('change', this.#onSchemeChange);
  }

  #onSchemeChange = () => {
    configureMermaid();
    void this.#render();
  };

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('source')) void this.#render();
  }

  async #render() {
    const renderId = ++this.#latestRenderId;
    const source = this.source;

    if (source.trim() === '') {
      this.#showPreview('', '');
      this.renderError = '';
      return;
    }

    const result = await renderDiagram(source);
    if (renderId !== this.#latestRenderId) return;

    if ('svg' in result) {
      this.#showPreview(source, result.svg);
      this.renderError = '';
      return;
    }

    this.renderError = result.error;

    // The kept Preview may be in the previous theme; redraw it in the current one.
    if (this.#lastGoodSource && this.#lastGoodTheme !== currentTheme()) {
      const redrawn = await renderDiagram(this.#lastGoodSource);
      if (renderId !== this.#latestRenderId) return;
      if ('svg' in redrawn) this.#showPreview(this.#lastGoodSource, redrawn.svg);
    }
  }

  #showPreview(source: string, svg: string) {
    this.#lastGoodSource = source;
    this.#lastGoodTheme = currentTheme();
    this.svg = svg;
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
