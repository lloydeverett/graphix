import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { Minus, Plus, Settings } from 'lucide';
import './context-menu.js';
import './preview-pane.js';
// Parcel drops a type-only import entirely, so import for the side effect too.
import './source-editor.js';
import './split-pane.js';
import { DEFAULT_BASE_STYLE, isBaseStyleId } from './base-style.js';
import type { MenuItem } from './context-menu.js';
import {
  DEFAULT_EDITOR_COLOR_SCHEME,
  EDITOR_COLOR_SCHEMES,
  type EditorColorSchemeId,
  editorColorScheme,
  isEditorColorSchemeId,
} from './editor-color-scheme.js';
import { DEFAULT_EDITOR_FONT, EDITOR_FONTS, type EditorFontId, isEditorFontId } from './editor-font.js';
import { icon } from './icon.js';
import { DEFAULT_PREVIEW_FONT, isPreviewFontId } from './preview-font.js';
import type { PreviewPane } from './preview-pane.js';
import type { SourceEditor } from './source-editor.js';
import { toolbarStyles } from './toolbar-styles.js';

const SOURCE_STORAGE_KEY = 'graphix:source';
const BASE_STYLE_STORAGE_KEY = 'graphix:base-style';
const PREVIEW_FONT_STORAGE_KEY = 'graphix:preview-font';
const WORD_WRAP_STORAGE_KEY = 'graphix:word-wrap';
const EDITOR_FONT_STORAGE_KEY = 'graphix:editor-font';
/** Where the Use system font setting, which Editor Font replaced, was kept. */
const SYSTEM_FONT_STORAGE_KEY = 'graphix:system-font';
const EDITOR_COLOR_SCHEME_STORAGE_KEY = 'graphix:editor-color-scheme';
const TEXT_SIZE_STORAGE_KEY = 'graphix:text-size';
const VIM_MODE_STORAGE_KEY = 'graphix:vim-mode';

/** The range of text sizes the Source can be set to, in px. */
const MIN_TEXT_SIZE = 10;
const MAX_TEXT_SIZE = 32;

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

/**
 * The value kept in localStorage under `key`, or `fallback` if there's none,
 * `parse` rejects it (by returning undefined), or storage is unavailable.
 */
function load<T>(key: string, parse: (saved: string) => T | undefined, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return (saved === null ? undefined : parse(saved)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Keeps `value` in localStorage under `key`. */
function save(key: string, value: string | number | boolean) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable (e.g. private mode); it just won't persist.
  }
}

/** A setting that's on or off, kept in localStorage under `key`. */
function loadFlag(key: string, fallback: boolean): boolean {
  return load(key, (saved) => (saved === 'true' ? true : saved === 'false' ? false : undefined), fallback);
}

/**
 * The text size until the user picks one. Mobile browsers zoom in on focused
 * text smaller than 16px, so touch screens start there.
 */
function defaultTextSize(): number {
  return matchMedia('(pointer: coarse)').matches ? 16 : 14;
}

function parseTextSize(saved: string): number | undefined {
  const textSize = Number(saved);
  return textSize >= MIN_TEXT_SIZE && textSize <= MAX_TEXT_SIZE ? textSize : undefined;
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

      .text-size {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        padding: 4px 0 0 32px;
        border-top: 1px solid var(--border);
      }

      .text-size > span:first-child {
        flex: 1;
      }

      .text-size menu-item {
        padding: 4px;
      }

      .text-size output {
        min-width: 2ch;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
    `,
  ];

  /** The Source as typed. */
  @state() source = load(SOURCE_STORAGE_KEY, (saved) => saved, EXAMPLE_SOURCE);

  /** The Base Style the Preview is shown with. */
  @state() baseStyle = load(
    BASE_STYLE_STORAGE_KEY,
    (saved) => (isBaseStyleId(saved) ? saved : undefined),
    DEFAULT_BASE_STYLE,
  );

  /** The font the Preview's text is shown in, over the Base Style's. */
  @state() previewFont = load(
    PREVIEW_FONT_STORAGE_KEY,
    (saved) => (isPreviewFontId(saved) ? saved : undefined),
    DEFAULT_PREVIEW_FONT,
  );

  /** Whether long lines in the Source wrap. */
  @state() wordWrap = loadFlag(WORD_WRAP_STORAGE_KEY, true);

  /** The font the Source is shown in; Use system font, if it was on, carries over as System Mono. */
  @state() editorFont = load(
    EDITOR_FONT_STORAGE_KEY,
    (saved) => (isEditorFontId(saved) ? saved : undefined),
    loadFlag(SYSTEM_FONT_STORAGE_KEY, false) ? 'system-mono' : DEFAULT_EDITOR_FONT,
  );

  /** The Editor Font being tried on from the open menu, shown in place of `editorFont` until one is chosen. */
  @state() tryingOnEditorFont?: EditorFontId;

  /** The colours the Source and its toolbar are shown in. */
  @state() editorColorScheme = load(
    EDITOR_COLOR_SCHEME_STORAGE_KEY,
    (saved) => (isEditorColorSchemeId(saved) ? saved : undefined),
    DEFAULT_EDITOR_COLOR_SCHEME,
  );

  /** The Editor Color Scheme being tried on from the open menu, shown in place of `editorColorScheme` until one is chosen. */
  @state() tryingOnEditorColorScheme?: EditorColorSchemeId;

  /** The Source's text size, in px. */
  @state() textSize = load(TEXT_SIZE_STORAGE_KEY, parseTextSize, defaultTextSize());

  /** Whether the Source is edited with Vim's keys and modes. */
  @state() vimMode = loadFlag(VIM_MODE_STORAGE_KEY, false);

  #settingsIcon = icon(Settings);
  #smallerIcon = icon(Minus);
  #largerIcon = icon(Plus);

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
    save(SOURCE_STORAGE_KEY, this.source);
  }

  #onBaseStyleChange(event: Event) {
    this.baseStyle = (event.target as PreviewPane).baseStyle;
    save(BASE_STYLE_STORAGE_KEY, this.baseStyle);
  }

  #onPreviewFontChange(event: Event) {
    this.previewFont = (event.target as PreviewPane).previewFont;
    save(PREVIEW_FONT_STORAGE_KEY, this.previewFont);
  }

  #onWordWrapSelect(event: Event) {
    this.wordWrap = (event.target as MenuItem).checked;
    save(WORD_WRAP_STORAGE_KEY, this.wordWrap);
  }

  /** Tries on the Editor Font whose item has focus, from the pointer or the arrow keys. */
  #onEditorFontFocus(event: FocusEvent) {
    const { value } = event.target as MenuItem;
    if (isEditorFontId(value)) this.tryingOnEditorFont = value;
  }

  /** Leaving the fonts, the pointer puts back the chosen Editor Font, to compare it with the ones tried on. */
  #onEditorFontsLeave() {
    this.tryingOnEditorFont = undefined;
  }

  /** Closed without a choice, the menu puts back the Editor Font and Editor Color Scheme that were chosen. */
  #onSettingsMenuToggle(event: ToggleEvent) {
    if (event.newState !== 'closed') return;
    this.tryingOnEditorFont = undefined;
    this.tryingOnEditorColorScheme = undefined;
  }

  #onEditorFontSelect(event: Event) {
    const { value } = event.target as MenuItem;
    if (!isEditorFontId(value)) return;
    this.editorFont = value;
    save(EDITOR_FONT_STORAGE_KEY, this.editorFont);
  }

  /** Tries on the Editor Color Scheme whose item has focus, from the pointer or the arrow keys. */
  #onEditorColorSchemeFocus(event: FocusEvent) {
    const { value } = event.target as MenuItem;
    if (isEditorColorSchemeId(value)) this.tryingOnEditorColorScheme = value;
  }

  /** Leaving the schemes, the pointer puts back the chosen Editor Color Scheme, to compare it with the ones tried on. */
  #onEditorColorSchemesLeave() {
    this.tryingOnEditorColorScheme = undefined;
  }

  #onEditorColorSchemeSelect(event: Event) {
    const { value } = event.target as MenuItem;
    if (!isEditorColorSchemeId(value)) return;
    this.editorColorScheme = value;
    save(EDITOR_COLOR_SCHEME_STORAGE_KEY, this.editorColorScheme);
  }

  #onVimModeSelect(event: Event) {
    this.vimMode = (event.target as MenuItem).checked;
    save(VIM_MODE_STORAGE_KEY, this.vimMode);
  }

  #stepTextSize(step: number) {
    this.textSize += step;
    save(TEXT_SIZE_STORAGE_KEY, this.textSize);
  }

  render() {
    const colorScheme = this.tryingOnEditorColorScheme ?? this.editorColorScheme;
    // The toolbar sits on the Source, in its colours; the menu keeps the editor's.
    const { colors } = editorColorScheme(colorScheme);
    return html`
      <split-pane
        orientation=${this.narrow ? 'vertical' : 'horizontal'}
        storage-key="graphix:split"
      >
        <div class="source">
          <header
            style=${styleMap({ '--toolbar-background': colors?.['--surface'], '--toolbar-text': colors?.['--fg'] })}
          >
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
            <context-menu
              id="settings-menu"
              aria-label="Settings"
              align="end"
              @toggle=${this.#onSettingsMenuToggle}
            >
              <menu-item
                type="checkbox"
                .checked=${this.wordWrap}
                @menu-select=${this.#onWordWrapSelect}
              >Word wrap</menu-item>
              <menu-item
                type="checkbox"
                .checked=${this.vimMode}
                @menu-select=${this.#onVimModeSelect}
              >Vim mode</menu-item>
              <div class="text-size" role="group" aria-label="Text size">
                <span>Text size</span>
                <menu-item
                  keep-open
                  aria-label="Smaller text"
                  .disabled=${this.textSize <= MIN_TEXT_SIZE}
                  @menu-select=${() => this.#stepTextSize(-1)}
                >${this.#smallerIcon}</menu-item>
                <output>${this.textSize}</output>
                <menu-item
                  keep-open
                  aria-label="Larger text"
                  .disabled=${this.textSize >= MAX_TEXT_SIZE}
                  @menu-select=${() => this.#stepTextSize(1)}
                >${this.#largerIcon}</menu-item>
              </div>
              <menu-group
                label="Font"
                @focusin=${this.#onEditorFontFocus}
                @menu-select=${this.#onEditorFontSelect}
                @pointerleave=${this.#onEditorFontsLeave}
              >
                ${EDITOR_FONTS.map(
                  ({ id, label }) =>
                    html`<menu-item type="radio" value=${id} .checked=${id === this.editorFont}>${label}</menu-item>`,
                )}
              </menu-group>
              <menu-group
                label="Color scheme"
                @focusin=${this.#onEditorColorSchemeFocus}
                @menu-select=${this.#onEditorColorSchemeSelect}
                @pointerleave=${this.#onEditorColorSchemesLeave}
              >
                ${EDITOR_COLOR_SCHEMES.map(
                  ({ id, label }) =>
                    html`<menu-item type="radio" value=${id} .checked=${id === this.editorColorScheme}
                      >${label}</menu-item
                    >`,
                )}
              </menu-group>
            </context-menu>
          </header>
          <source-editor
            .value=${this.source}
            .wordWrap=${this.wordWrap}
            .editorFont=${this.tryingOnEditorFont ?? this.editorFont}
            .colorScheme=${colorScheme}
            .textSize=${this.textSize}
            .vimMode=${this.vimMode}
            @source-input=${this.#onInput}
          ></source-editor>
        </div>
        <split-divider aria-label="Resize the Source and Preview"></split-divider>
        <preview-pane
          .source=${this.source}
          .baseStyle=${this.baseStyle}
          .previewFont=${this.previewFont}
          @base-style-change=${this.#onBaseStyleChange}
          @preview-font-change=${this.#onPreviewFontChange}
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
