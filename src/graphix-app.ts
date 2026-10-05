import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Settings } from 'lucide';
import './context-menu.js';
import './preview-pane.js';
// Parcel drops a type-only import entirely, so import for the side effect too.
import './source-editor.js';
import './split-pane.js';
import { type BaseStyleId, DEFAULT_BASE_STYLE, isBaseStyleId } from './base-style.js';
import type { MenuItem } from './context-menu.js';
import { icon } from './icon.js';
import type { PreviewPane } from './preview-pane.js';
import type { SourceEditor } from './source-editor.js';
import { toolbarStyles } from './toolbar-styles.js';

const SOURCE_STORAGE_KEY = 'graphix:source';
const BASE_STYLE_STORAGE_KEY = 'graphix:base-style';
const WORD_WRAP_STORAGE_KEY = 'graphix:word-wrap';
const SYSTEM_FONT_STORAGE_KEY = 'graphix:system-font';

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
    return localStorage.getItem(SOURCE_STORAGE_KEY) ?? EXAMPLE_SOURCE;
  } catch {
    return EXAMPLE_SOURCE;
  }
}

function saveSource(source: string) {
  try {
    localStorage.setItem(SOURCE_STORAGE_KEY, source);
  } catch {
    // Storage unavailable (e.g. private mode); the Source just won't persist.
  }
}

function loadBaseStyle(): BaseStyleId {
  try {
    const saved = localStorage.getItem(BASE_STYLE_STORAGE_KEY);
    return isBaseStyleId(saved) ? saved : DEFAULT_BASE_STYLE;
  } catch {
    return DEFAULT_BASE_STYLE;
  }
}

function saveBaseStyle(baseStyle: BaseStyleId) {
  try {
    localStorage.setItem(BASE_STYLE_STORAGE_KEY, baseStyle);
  } catch {
    // Storage unavailable; the Base Style just won't persist.
  }
}

function loadWordWrap(): boolean {
  try {
    return localStorage.getItem(WORD_WRAP_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function saveWordWrap(wordWrap: boolean) {
  try {
    localStorage.setItem(WORD_WRAP_STORAGE_KEY, String(wordWrap));
  } catch {
    // Storage unavailable; the setting just won't persist.
  }
}

function loadSystemFont(): boolean {
  try {
    return localStorage.getItem(SYSTEM_FONT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveSystemFont(systemFont: boolean) {
  try {
    localStorage.setItem(SYSTEM_FONT_STORAGE_KEY, String(systemFont));
  } catch {
    // Storage unavailable; the setting just won't persist.
  }
}

@customElement('graphix-app')
export class GraphixApp extends LitElement {
  static styles = [
    toolbarStyles,
    css`
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
        /* Enough of the Source and Preview to read and edit. */
        --split-pane-min-size: 240px;
      }

      split-pane[orientation='vertical'] {
        --split-pane-min-size: 120px;
      }

      .source {
        display: flex;
        flex-direction: column;
      }

      source-editor {
        display: block;
        flex: 1;
        min-height: 0;
      }

      source-editor[system-font] {
        --editor-font-family: ui-monospace, monospace;
      }
    `,
  ];

  /** The Source as typed. */
  @state() source = loadSource();

  /** The Base Style the Preview is shown with. */
  @state() baseStyle = loadBaseStyle();

  /** Whether long lines in the Source wrap. */
  @state() wordWrap = loadWordWrap();

  /** Whether the Source is shown in the system's monospace font, rather than Cascadia Mono. */
  @state() systemFont = loadSystemFont();

  #settingsIcon = icon(Settings);

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

  #onBaseStyleChange(event: Event) {
    this.baseStyle = (event.target as PreviewPane).baseStyle;
    saveBaseStyle(this.baseStyle);
  }

  #onWordWrapSelect(event: Event) {
    this.wordWrap = (event.target as MenuItem).checked;
    saveWordWrap(this.wordWrap);
  }

  #onSystemFontSelect(event: Event) {
    this.systemFont = (event.target as MenuItem).checked;
    saveSystemFont(this.systemFont);
  }

  render() {
    return html`
      <split-pane
        orientation=${this.narrow ? 'vertical' : 'horizontal'}
        storage-key="graphix:split"
      >
        <div class="source">
          <header>
            <button
              type="button"
              class="icon-button"
              aria-label="Settings"
              title="Settings"
              aria-haspopup="menu"
              popovertarget="settings-menu"
            >
              ${this.#settingsIcon}
            </button>
            <!-- Lined up with the gear's right edge, so it opens over the Source, not the Preview. -->
            <context-menu id="settings-menu" aria-label="Settings" align="end">
              <menu-item
                type="checkbox"
                .checked=${this.wordWrap}
                @menu-select=${this.#onWordWrapSelect}
              >Word wrap</menu-item>
              <menu-item
                type="checkbox"
                .checked=${this.systemFont}
                @menu-select=${this.#onSystemFontSelect}
              >Use system font</menu-item>
            </context-menu>
          </header>
          <source-editor
            .value=${this.source}
            .wordWrap=${this.wordWrap}
            .systemFont=${this.systemFont}
            @source-input=${this.#onInput}
          ></source-editor>
        </div>
        <split-divider aria-label="Resize the Source and Preview"></split-divider>
        <preview-pane
          .source=${this.source}
          .baseStyle=${this.baseStyle}
          @base-style-change=${this.#onBaseStyleChange}
        ></preview-pane>
      </split-pane>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'graphix-app': GraphixApp;
  }
}
