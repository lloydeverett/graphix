import { html as htmlLanguage } from '@codemirror/lang-html';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, Prec } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { getCM, vim } from '@replit/codemirror-vim';
import { EditorView, basicSetup } from 'codemirror';
import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  DEFAULT_EDITOR_COLOR_SCHEME,
  EDITOR_COLOR_TOKENS,
  type EditorColorSchemeId,
  findEditorColorScheme,
} from './editor-color-scheme.js';
import { DEFAULT_EDITOR_FONT, type EditorFontId, editorFontFamily } from './editor-font.js';

/** Colours come from theme.css's tokens, so they follow the light and dark themes, and the Editor Color Scheme. */
const highlightStyle = HighlightStyle.define([
  { tag: [tags.tagName, tags.angleBracket], color: 'var(--syntax-tag)' },
  { tag: [tags.attributeName, tags.propertyName, tags.number], color: 'var(--syntax-attribute)' },
  { tag: [tags.attributeValue, tags.string], color: 'var(--syntax-string)' },
  { tag: [tags.comment, tags.documentMeta], color: 'var(--syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.keyword, tags.processingInstruction, tags.character], color: 'var(--syntax-keyword)' },
  { tag: tags.invalid, color: 'var(--error-fg)' },
]);

const theme = EditorView.theme({
  '&': {
    height: '100%',
    background: 'var(--surface)',
    color: 'var(--fg)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { lineHeight: '1.5' },
  '.cm-content': { padding: '16px 0', caretColor: 'var(--fg)' },
  '.cm-line': { padding: '0 16px 0 8px' },
  '.cm-cursor': { borderLeftColor: 'var(--fg)' },
  '.cm-gutters': {
    background: 'var(--surface)',
    color: 'var(--syntax-comment)',
    border: 'none',
  },
  '.cm-activeLine, .cm-activeLineGutter': { background: 'var(--active-line)' },
  // As specific as CodeMirror's own rule for a focused selection, or it wins.
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground': {
    background: 'var(--selection)',
  },
  '.cm-selectionMatch': { background: 'var(--selection-match)' },
  '.cm-searchMatch': { background: 'var(--search-match)' },
  // The selected match is the selection too, so let the selection show through.
  '.cm-searchMatch.cm-searchMatch-selected': {
    background: 'transparent',
    outline: '1px solid var(--search-match-outline)',
  },
  '.cm-matchingBracket': { background: 'var(--selection)', outline: 'none' },
  // Where Vim mode's `:` and `/` commands are typed, as is a search.
  '.cm-panels': { background: 'var(--surface)', color: 'var(--fg)', fontSize: 'var(--editor-panel-font-size)' },
  // CodeMirror shrinks these to under the panel's size, or fixes it; keep them at it, as the toolbar's controls are.
  // As specific as CodeMirror's rule for a search's labels, or it wins.
  '.cm-textfield, .cm-button, .cm-panels .cm-panel label, .cm-dialog-close': { fontSize: 'inherit' },
  // Fields and buttons take the font of the editor's controls, not the browser's.
  '.cm-textfield, .cm-button': { fontFamily: 'inherit' },
  '.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
});

/**
 * The theme's colours for CodeMirror's tooltips, fields and buttons, which
 * are otherwise its own: for Default's dark theme, and every other Editor
 * Color Scheme. Default's light theme keeps CodeMirror's colours.
 */
const controlsTheme = EditorView.theme({
  '.cm-tooltip': {
    background: 'var(--surface)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
  },
  '.cm-tooltip-section:not(:first-child)': { borderTop: '1px solid var(--border)' },
  '.cm-tooltip .cm-tooltip-arrow': {
    '&:before': { borderTopColor: 'var(--border)', borderBottomColor: 'var(--border)' },
    '&:after': { borderTopColor: 'var(--surface)', borderBottomColor: 'var(--surface)' },
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    background: 'var(--selection)',
    color: 'var(--fg)',
  },
  // A search's fields and buttons, like the toolbar's.
  '.cm-textfield': {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
  },
  '.cm-button': {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    '&:active': { background: 'var(--active-line)' },
  },
  // What stands in for folded lines, which CodeMirror colours light in either theme.
  '.cm-foldPlaceholder': {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--syntax-comment)',
  },
});

/** Whether the page is in its dark theme, as theme.css decides it. */
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

/**
 * Vim mode in the theme's colours. Vim colours some things inline, so these
 * need `!important`; and its own theme takes the highest precedence, so this
 * does too, and comes first.
 */
const vimTheme = Prec.highest(
  EditorView.theme({
    // The block cursor, in reverse video: the text's colour, with the letter
    // under it in the background's. Vim colours that letter as the text it covers.
    '.cm-fat-cursor': { background: 'var(--fg)' },
    // Not a short cursor (while an operator waits, or in Replace mode), whose letter Vim hides.
    '&.cm-focused .cm-fat-cursor:not([style*="color: transparent"])': { color: 'var(--surface) !important' },
    '&:not(.cm-focused) .cm-fat-cursor': { background: 'none', outline: '1px solid var(--fg)' },
    // Vim shows every message in red, from "1 lines yanked" to an error, so show them all as text.
    '.cm-vim-message': { color: 'var(--fg) !important' },
    // A prompt, `:` or `/`, sets its own font inline; take the panel's, so the
    // prompt and what's typed after it are in one font, side by side.
    '.cm-vim-panel [style*="font-family"]': { fontFamily: 'inherit !important' },
    '.cm-vim-panel input': { font: 'inherit', color: 'inherit', padding: '0', margin: '0' },
    // A prompt's hint, like the one beside a search.
    '.cm-vim-panel [style*="color"]:not(.cm-vim-message)': { color: 'var(--syntax-comment) !important' },
  }),
);

/**
 * Edits a Source as HTML in CodeMirror. Rendered without a shadow root, so the
 * parent lays it out like any element; CodeMirror scopes its own styles.
 *
 * @fires source-input - when the user edits the Source; `value` is the new text.
 */
@customElement('source-editor')
export class SourceEditor extends LitElement {
  /** The Source. Setting it from outside replaces the Source in the editor, as one undoable edit. */
  @property() value = '';

  /** Whether long lines wrap to fit the editor, rather than scroll sideways. */
  @property({ type: Boolean }) wordWrap = true;

  /** The font to show the Source in. */
  @property() editorFont: EditorFontId = DEFAULT_EDITOR_FONT;

  /** The colours to show the Source in. */
  @property() editorColorScheme: EditorColorSchemeId = DEFAULT_EDITOR_COLOR_SCHEME;

  /** The text size, in px. */
  @property({ type: Number }) textSize = 14;

  /** Whether the editor takes Vim's keys and modes. */
  @property({ type: Boolean }) vimMode = false;

  #wordWrapCompartment = new Compartment();
  #fontCompartment = new Compartment();
  #vimCompartment = new Compartment();
  #colorSchemeCompartment = new Compartment();

  #view?: EditorView;

  /** Set while `updated()` applies an outside `value`, which isn't an edit to report. */
  #applyingValue = false;

  /** What last took focus in the editor: its text, or a Vim prompt. */
  #lastFocused: EventTarget | null = null;

  protected createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.addEventListener('focusin', (event) => {
      this.#lastFocused = event.target;
    });
  }

  connectedCallback() {
    super.connectedCallback();
    darkQuery.addEventListener('change', this.#reconfigureColorScheme);
    this.#view ??= new EditorView({
      parent: this,
      doc: this.value,
      extensions: [
        // Vim's keymap must come before the others, or theirs take its keys.
        this.#vimCompartment.of(this.#vimExtension()),
        basicSetup,
        htmlLanguage(),
        syntaxHighlighting(highlightStyle),
        this.#wordWrapCompartment.of(this.#wordWrapExtension()),
        this.#fontCompartment.of(this.#fontTheme()),
        this.#colorSchemeCompartment.of(this.#colorSchemeExtension()),
        EditorView.contentAttributes.of({ 'aria-label': 'HTML source', spellcheck: 'false' }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || this.#applyingValue) return;
          this.value = update.state.doc.toString();
          this.dispatchEvent(new Event('source-input'));
        }),
        theme,
      ],
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    darkQuery.removeEventListener('change', this.#reconfigureColorScheme);
    this.#view?.destroy();
    this.#view = undefined;
  }

  /** Has CodeMirror use its dark or light colours to match the Editor Color Scheme, and `controlsTheme` but in Default's light theme. */
  #colorSchemeExtension() {
    const { dark = darkQuery.matches, colors } = findEditorColorScheme(this.editorColorScheme);
    return [dark || colors ? controlsTheme : [], EditorView.darkTheme.of(dark)];
  }

  /** Called as the Editor Color Scheme changes, and as the system's does, which Default follows. */
  #reconfigureColorScheme = () => {
    this.#view?.dispatch({ effects: this.#colorSchemeCompartment.reconfigure(this.#colorSchemeExtension()) });
  };

  /**
   * Sets the Editor Color Scheme's colours on this element, over theme.css's,
   * for everything inside it to take up; Default sets none. Its
   * `color-scheme` gives scrollbars and the like its lightness too.
   */
  #applyColorScheme() {
    const { dark, colors } = findEditorColorScheme(this.editorColorScheme);
    for (const name of EDITOR_COLOR_TOKENS) this.style.removeProperty(name);
    for (const [name, value] of Object.entries(colors ?? {})) this.style.setProperty(name, value);
    this.style.colorScheme = dark === undefined ? '' : dark ? 'dark' : 'light';
  }

  #wordWrapExtension() {
    return this.wordWrap ? EditorView.lineWrapping : [];
  }

  /**
   * Vim gives focus back to the text when an error replaces its `:` prompt
   * only if `document.activeElement` was in the prompt; but the editor is
   * inside graphix-app's shadow root, so that's graphix-app, and focus would
   * fall to the page. So if what had
   * focus here has gone, give it back.
   */
  #onVimDialog = () => {
    if (this.#lastFocused instanceof Node && !this.#lastFocused.isConnected) this.#view?.focus();
  };

  #vimExtension() {
    // Of themes with the same precedence, the first wins.
    return this.vimMode ? [vimTheme, vim()] : [];
  }

  /**
   * The text's size and font, as a theme of their own: CodeMirror measures
   * every line again when its theme changes, but not when a CSS variable
   * does, and until it does the line numbers stay where the lines were.
   * Autocomplete lists code, so it's in the text's size too, but panels
   * like a search's are the editor's own controls, and keep theirs.
   */
  #fontTheme() {
    return EditorView.theme({
      '.cm-scroller, .cm-tooltip-autocomplete': { fontSize: `${this.textSize}px` },
      // And Vim's panel, where `:` and `/` commands are typed, as Vim gives it a monospace font.
      '.cm-scroller, .cm-vim-panel': { fontFamily: editorFontFamily(this.editorFont) },
    });
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('editorColorScheme')) {
      this.#applyColorScheme();
      this.#reconfigureColorScheme();
    }
    if (changed.has('textSize') || changed.has('editorFont')) {
      this.#view?.dispatch({ effects: this.#fontCompartment.reconfigure(this.#fontTheme()) });
    }
    if (changed.has('vimMode')) {
      this.#view?.dispatch({ effects: this.#vimCompartment.reconfigure(this.#vimExtension()) });
      if (this.#view) getCM(this.#view)?.on('dialog', this.#onVimDialog);
    }
    if (changed.has('wordWrap')) {
      this.#view?.dispatch({ effects: this.#wordWrapCompartment.reconfigure(this.#wordWrapExtension()) });
    }
    // Edits made in the editor already match; only outside changes replace it.
    const view = this.#view;
    if (changed.has('value') && view && this.value !== view.state.doc.toString()) {
      // dispatch runs the update listener synchronously, before this returns.
      this.#applyingValue = true;
      try {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: this.value } });
      } finally {
        this.#applyingValue = false;
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'source-editor': SourceEditor;
  }
}
