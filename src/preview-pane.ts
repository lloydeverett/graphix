import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { styleMap } from 'lit/directives/style-map.js';
import { ChevronDown, RefreshCw, Settings } from 'lucide';
import { BASE_STYLES, type BaseStyleId, DEFAULT_BASE_STYLE, isBaseStyleId } from './base-style.js';
import './context-menu.js';
import type { MenuItem } from './context-menu.js';
import { icon } from './icon.js';
import { DEFAULT_PREVIEW_FONT, PREVIEW_FONTS, type PreviewFontId, isPreviewFontId } from './preview-font.js';
import {
  type BaseStyleMessage,
  type PreviewFontMessage,
  type SourceMessage,
  isPageColorsMessage,
  isReadyMessage,
} from './preview-protocol.js';
import { toolbarStyles } from './toolbar-styles.js';

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
 * don't change it. It carries the starting Base Style and Preview Font too,
 * so the Preview can show them before the editor connects.
 */
function previewUrl(nonce: string, baseStyle: BaseStyleId, previewFont: PreviewFontId) {
  const url = new URL(PREVIEW_URL);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('base-style', baseStyle);
  url.searchParams.set('preview-font', previewFont);
  return url.href;
}

/**
 * Shows a Source as a Preview: the HTML rendered in a sandboxed iframe, which
 * is updated in place as the Source changes and rebuilt only on Refresh.
 * Choosing a Base Style restyles it in place too, and while the Base Style
 * menu is open, the Preview tries on whichever one is under the pointer or
 * the keyboard's focus. With the pointer outside the menu, or the menu
 * closed, it shows the one chosen. The toolbar takes the colours of the
 * page in the Preview, so it sits on the Base Style it shows. Its settings
 * menu chooses the Preview Font, and tries each one on in the same way.
 *
 * @fires base-style-change - when the user chooses a Base Style; `baseStyle` is the new one.
 * @fires preview-font-change - when the user chooses a Preview Font; `previewFont` is the new one.
 */
@customElement('preview-pane')
export class PreviewPane extends LitElement {
  static styles = [
    toolbarStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      /* In the page's colours, with controls drawn from its text, so they suit any Base Style. */
      header {
        background: var(--page-background, var(--surface));
        color: var(--page-text, var(--fg));
        border-bottom-color: color-mix(in srgb, currentColor 20%, transparent);
      }

      header button {
        border-color: color-mix(in srgb, currentColor 30%, transparent);
        background: color-mix(in srgb, currentColor 6%, transparent);
        color: inherit;
      }

      .base-style {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding-right: 4px;
      }

      #base-style-menu {
        min-width: 180px;
      }

      iframe {
        flex: 1;
        width: 100%;
        border: none;
      }
    `,
  ];

  @property() source = '';

  @property() baseStyle: BaseStyleId = DEFAULT_BASE_STYLE;

  @property() previewFont: PreviewFontId = DEFAULT_PREVIEW_FONT;

  /** The Base Style being tried on from the open menu, shown in place of `baseStyle` until one is chosen. */
  @state() tryingOnStyle?: BaseStyleId;

  /** The Preview Font being tried on from the open menu, shown in place of `previewFont` until one is chosen. */
  @state() tryingOnFont?: PreviewFontId;

  /** Identifies the current iframe; a new one gets a new nonce. */
  @state() nonce = newNonce();

  /** The colours of the page in the Preview, as it last reported them. */
  @state() pageColors?: { background: string; text: string };

  /**
   * The current iframe's URL. Fixed when the iframe is made, so choosing a
   * Base Style or Preview Font doesn't navigate it.
   */
  #src = '';

  #refreshIcon = icon(RefreshCw);
  #chevronIcon = icon(ChevronDown);
  #settingsIcon = icon(Settings);

  /** The Base Style on screen: the one being tried on, or else the one chosen. */
  get #shownStyle() {
    return this.tryingOnStyle ?? this.baseStyle;
  }

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
    port.onmessage = ({ data }) => {
      if (isPageColorsMessage(data)) this.pageColors = { background: data.background, text: data.text };
    };
    this.#sendBaseStyle();
    this.#sendPreviewFont();
    this.#sendSource();
  };

  #sendSource() {
    const message: SourceMessage = { type: 'graphix:source', source: this.source };
    this.#port?.postMessage(message);
  }

  #sendBaseStyle() {
    const message: BaseStyleMessage = { type: 'graphix:base-style', baseStyle: this.#shownStyle };
    this.#port?.postMessage(message);
  }

  #sendPreviewFont() {
    const message: PreviewFontMessage = {
      type: 'graphix:preview-font',
      previewFont: this.tryingOnFont ?? this.previewFont,
    };
    this.#port?.postMessage(message);
  }

  /** Tries on the Base Style whose item has focus, from the pointer or the arrow keys. */
  #onBaseStyleFocus(event: FocusEvent) {
    const { value } = event.target as MenuItem;
    if (isBaseStyleId(value)) this.tryingOnStyle = value;
  }

  #onBaseStyleSelect(event: Event) {
    const { value } = event.target as MenuItem;
    if (!isBaseStyleId(value)) return;
    this.baseStyle = value;
    this.dispatchEvent(new Event('base-style-change'));
  }

  /** Leaving the menu, the pointer puts back the chosen Base Style, to compare it with the ones tried on. */
  #onBaseStyleMenuLeave() {
    this.tryingOnStyle = undefined;
  }

  /** Closed without a choice, the menu puts back the Base Style that was chosen. */
  #onBaseStyleMenuToggle(event: ToggleEvent) {
    if (event.newState === 'closed') this.tryingOnStyle = undefined;
  }

  /** Tries on the Preview Font whose item has focus, from the pointer or the arrow keys. */
  #onPreviewFontFocus(event: FocusEvent) {
    const { value } = event.target as MenuItem;
    if (isPreviewFontId(value)) this.tryingOnFont = value;
  }

  /** Leaving the fonts, the pointer puts back the chosen Preview Font, to compare it with the ones tried on. */
  #onPreviewFontsLeave() {
    this.tryingOnFont = undefined;
  }

  /** Closed without a choice, the menu puts back the Preview Font that was chosen. */
  #onPreviewSettingsMenuToggle(event: ToggleEvent) {
    if (event.newState === 'closed') this.tryingOnFont = undefined;
  }

  #onPreviewFontSelect(event: Event) {
    const { value } = event.target as MenuItem;
    if (!isPreviewFontId(value)) return;
    this.previewFont = value;
    this.dispatchEvent(new Event('preview-font-change'));
  }

  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    if (changed.has('nonce')) this.#src = previewUrl(this.nonce, this.baseStyle, this.previewFont);
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('baseStyle') || changed.has('tryingOnStyle')) this.#sendBaseStyle();
    if (changed.has('previewFont') || changed.has('tryingOnFont')) this.#sendPreviewFont();
    if (changed.has('source')) this.#sendSource();
  }

  render() {
    const label = BASE_STYLES.find(({ id }) => id === this.baseStyle)?.label ?? this.baseStyle;
    return html`
      <header
        style=${styleMap({ '--page-background': this.pageColors?.background, '--page-text': this.pageColors?.text })}
      >
        <button
          type="button"
          class="base-style"
          aria-label="Base style: ${label}"
          title="The stylesheet the Preview starts from"
          aria-haspopup="menu"
          popovertarget="base-style-menu"
        >
          ${label} ${this.#chevronIcon}
        </button>
        <context-menu
          id="base-style-menu"
          aria-label="Base style"
          align="end"
          @focusin=${this.#onBaseStyleFocus}
          @menu-select=${this.#onBaseStyleSelect}
          @pointerleave=${this.#onBaseStyleMenuLeave}
          @toggle=${this.#onBaseStyleMenuToggle}
        >
          ${BASE_STYLES.map(
            ({ id, label }) =>
              html`<menu-item type="radio" value=${id} .checked=${id === this.baseStyle}>${label}</menu-item>`,
          )}
        </context-menu>
        <button
          type="button"
          class="icon-button"
          aria-label="Refresh"
          title="Refresh: rebuild the Preview from scratch"
          @click=${this.refresh}
        >
          ${this.#refreshIcon}
        </button>
        <button
          type="button"
          class="icon-button"
          aria-label="Preview settings"
          title="Preview settings"
          aria-haspopup="menu"
          popovertarget="preview-settings-menu"
        >
          ${this.#settingsIcon}
        </button>
        <context-menu
          id="preview-settings-menu"
          aria-label="Preview settings"
          align="end"
          @toggle=${this.#onPreviewSettingsMenuToggle}
        >
          <menu-group
            label="Font"
            @focusin=${this.#onPreviewFontFocus}
            @menu-select=${this.#onPreviewFontSelect}
            @pointerleave=${this.#onPreviewFontsLeave}
          >
            ${PREVIEW_FONTS.map(
              ({ id, label }) =>
                html`<menu-item type="radio" value=${id} .checked=${id === this.previewFont}>${label}</menu-item>`,
            )}
          </menu-group>
        </context-menu>
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
