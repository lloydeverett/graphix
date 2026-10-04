import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { RefreshCw, createElement } from 'lucide';
import { BASE_STYLES, type BaseStyleId, DEFAULT_BASE_STYLE, isBaseStyleId } from './base-style.js';
import { type BaseStyleMessage, type SourceMessage, isReadyMessage } from './preview-protocol.js';

/**
 * preview.html is its own Parcel entry, served beside the editor. Reached via
 * `new URL(..., import.meta.url)` instead, Parcel bundles its scripts without
 * running them.
 */
const PREVIEW_URL = new URL('preview.html', document.baseURI);

/**
 * Built with GRAPHIX_SAME_ORIGIN_PREVIEW=1, the Preview shares the editor's
 * origin, so its scripts load without CORS, for hosts that can't send
 * `Access-Control-Allow-Origin: *`. The Preview's CSP still stops the Source
 * from running code, but the origin no longer keeps it from the editor.
 */
const SANDBOX =
  process.env.GRAPHIX_SAME_ORIGIN_PREVIEW === '1' ? 'allow-scripts allow-same-origin' : 'allow-scripts';

/** crypto.randomUUID needs a secure context; the dev server may be plain HTTP. */
function newNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The query string carries the nonce: unlike the iframe's name, it doesn't
 * follow the iframe to another page, and unlike the hash, in-page links
 * don't change it. It carries the starting Base Style too, so the Preview
 * can load it before the editor connects.
 */
function previewUrl(nonce: string, baseStyle: BaseStyleId) {
  const url = new URL(PREVIEW_URL);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('base-style', baseStyle);
  return url.href;
}

/**
 * Shows a Source as a Preview: the HTML rendered in a sandboxed iframe, which
 * is updated in place as the Source changes and rebuilt only on Refresh.
 * Choosing a Base Style restyles it in place too.
 *
 * @fires base-style-change - when the user chooses a Base Style; `baseStyle` is the new one.
 */
@customElement('preview-pane')
export class PreviewPane extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    header {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    button,
    select {
      padding: 2px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg);
      color: var(--fg);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .icon-button {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
    }

    iframe {
      flex: 1;
      width: 100%;
      border: none;
    }
  `;

  @property() source = '';

  @property() baseStyle: BaseStyleId = DEFAULT_BASE_STYLE;

  /** Identifies the current iframe; a new one gets a new nonce. */
  @state() nonce = newNonce();

  /**
   * The current iframe's URL. Fixed when the iframe is made, so choosing a
   * Base Style doesn't navigate it.
   */
  #src = '';

  /** Made once, so each render reuses the same node. */
  #refreshIcon = createElement(RefreshCw, { width: 16, height: 16, 'aria-hidden': 'true' });

  /** Connects to the current iframe's runtime once it reports ready. */
  #port?: MessagePort;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.#onMessage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.#onMessage);
    this.#port?.close();
  }

  /** Throws away the iframe and its state, and builds the Preview afresh. */
  refresh() {
    this.#port?.close();
    this.#port = undefined;
    this.nonce = newNonce();
  }

  #onMessage = (event: MessageEvent) => {
    const iframe = this.renderRoot.querySelector('iframe');
    if (event.source !== iframe?.contentWindow) return;
    if (!isReadyMessage(event.data) || event.data.nonce !== this.nonce) return;
    const [port] = event.ports;
    if (!port) return;

    // If the iframe loads our page again, it sends a new port; the old one is dead.
    this.#port?.close();
    this.#port = port;
    this.#sendBaseStyle();
    this.#sendSource();
  };

  #sendSource() {
    const message: SourceMessage = { type: 'graphix:source', source: this.source };
    this.#port?.postMessage(message);
  }

  #sendBaseStyle() {
    const message: BaseStyleMessage = { type: 'graphix:base-style', baseStyle: this.baseStyle };
    this.#port?.postMessage(message);
  }

  #onBaseStyleChange(event: Event) {
    const { value } = event.target as HTMLSelectElement;
    if (!isBaseStyleId(value)) return;
    this.baseStyle = value;
    this.dispatchEvent(new Event('base-style-change'));
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('nonce')) this.#src = previewUrl(this.nonce, this.baseStyle);
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('baseStyle')) {
      // Set after the options render; on the <select> in the template, it can come before them.
      this.renderRoot.querySelector('select')!.value = this.baseStyle;
      this.#sendBaseStyle();
    }
    if (changed.has('source')) this.#sendSource();
  }

  render() {
    return html`
      <header>
        <select
          aria-label="Base style"
          title="The stylesheet the Preview starts from"
          @change=${this.#onBaseStyleChange}
        >
          ${BASE_STYLES.map(
            ({ id, label }) =>
              html`<option value=${id}>${label}</option>`,
          )}
        </select>
        <button
          type="button"
          class="icon-button"
          aria-label="Refresh"
          title="Refresh: rebuild the Preview from scratch"
          @click=${this.refresh}
        >
          ${this.#refreshIcon}
        </button>
      </header>
      ${keyed(
        this.nonce,
        html`<iframe
          title="Preview"
          sandbox=${SANDBOX}
          src=${this.#src}
        ></iframe>`,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'preview-pane': PreviewPane;
  }
}
