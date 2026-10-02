import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import mermaid from 'mermaid';
import { KEEP_ATTRIBUTE } from './morph.js';

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
// Registered before any element's listener, so it runs before they redraw.
darkScheme.addEventListener('change', configureMermaid);

type RenderResult = { svg: string } | { error: string };

/**
 * Finished renders by theme and Mermaid source. Lets a re-created element
 * (e.g. after editing the HTML around it) show its diagram without flicker.
 */
const renderCache = new Map<string, RenderResult>();
const RENDER_CACHE_SIZE = 100;

function cacheKey(source: string) {
  return `${currentTheme()}\n${source}`;
}

let nextDiagramId = 0;
let scratch: HTMLElement | undefined;

/**
 * Mermaid measures diagrams in a temporary element it looks up from <body>,
 * so give it a hidden spot there that the morph won't touch.
 */
function scratchElement() {
  if (!scratch?.isConnected) {
    scratch = document.createElement('div');
    scratch.setAttribute(KEEP_ATTRIBUTE, '');
    scratch.setAttribute('aria-hidden', 'true');
    scratch.style.cssText = 'position: absolute; top: 0; left: -10000px; visibility: hidden;';
    document.body.append(scratch);
  }
  return scratch;
}

async function renderDiagram(source: string): Promise<RenderResult> {
  const key = cacheKey(source);
  const cached = renderCache.get(key);
  if (cached) return cached;

  let result: RenderResult;
  try {
    const { svg } = await mermaid.render(`gx-mermaid-${++nextDiagramId}`, source, scratchElement());
    result = { svg };
  } catch (error) {
    result = { error: error instanceof Error ? error.message : String(error) };
  }

  renderCache.set(key, result);
  if (renderCache.size > RENDER_CACHE_SIZE) {
    renderCache.delete(renderCache.keys().next().value!);
  }
  return result;
}

/** Strips blank edge lines and the indentation common to every line. */
function dedent(text: string) {
  const lines = text.split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indents = lines.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0].length);
  const indent = Math.min(...indents);
  return lines.map((line) => line.slice(indent)).join('\n');
}

/**
 * Renders its text content as a Mermaid diagram. On a Render Error it keeps
 * the last diagram that rendered successfully and shows the error above it.
 */
@customElement('gx-mermaid')
export class GxMermaid extends LitElement {
  static styles = css`
    :host {
      display: block;
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
      display: flex;
      justify-content: center;
    }

    .diagram svg {
      max-width: 100%;
      height: auto;
    }
  `;

  @state() svg = '';
  @state() renderError = '';

  /** Results of any render older than this are stale and dropped. */
  #latestRenderId = 0;

  /** The Mermaid source behind the current diagram, and the theme it was drawn in. */
  #lastGoodSource = '';
  #lastGoodTheme = currentTheme();

  #observer = new MutationObserver(() => void this.#render());

  connectedCallback() {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, characterData: true, subtree: true });
    darkScheme.addEventListener('change', this.#onSchemeChange);
    void this.#render();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
    darkScheme.removeEventListener('change', this.#onSchemeChange);
  }

  #onSchemeChange = () => void this.#render();

  async #render() {
    const renderId = ++this.#latestRenderId;
    const source = dedent(this.textContent ?? '');

    if (source === '') {
      this.#showDiagram('', '');
      this.renderError = '';
      return;
    }

    const result = await renderDiagram(source);
    if (renderId !== this.#latestRenderId) return;

    if ('svg' in result) {
      this.#showDiagram(source, result.svg);
      this.renderError = '';
      return;
    }

    this.renderError = result.error;

    // The kept diagram may be in the previous theme; redraw it in the current one.
    if (this.#lastGoodSource && this.#lastGoodTheme !== currentTheme()) {
      const redrawn = await renderDiagram(this.#lastGoodSource);
      if (renderId !== this.#latestRenderId) return;
      if ('svg' in redrawn) this.#showDiagram(this.#lastGoodSource, redrawn.svg);
    }
  }

  #showDiagram(source: string, svg: string) {
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
    'gx-mermaid': GxMermaid;
  }
}
