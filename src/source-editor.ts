import { html as htmlLanguage } from '@codemirror/lang-html';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, Prec } from '@codemirror/state';
import { tags } from '@lezer/highlight';
import { getCM, vim } from '@replit/codemirror-vim';
import { EditorView, basicSetup } from 'codemirror';
import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** Colours come from theme.css, so they follow the light and dark themes. */
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
  '.cm-panels': { background: 'var(--surface)', color: 'var(--fg)' },
  '.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
});

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

  /** Whether to show the Source in the system's monospace font, rather than Cascadia Mono. */
  @property({ type: Boolean }) systemFont = false;

  /** The text size, in px. */
  @property({ type: Number }) textSize = 14;

  /** Whether the editor takes Vim's keys and modes. */
  @property({ type: Boolean }) vimMode = false;

  #wordWrapCompartment = new Compartment();
  #fontCompartment = new Compartment();
  #vimCompartment = new Compartment();

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
    this.#view?.destroy();
    this.#view = undefined;
  }

  #wordWrapExtension() {
    return this.wordWrap ? EditorView.lineWrapping : [];
  }

  /**
   * Vim gives focus back to the text when an error replaces its `:` prompt
   * only if `document.activeElement` was in the prompt; inside a shadow root
   * it's the host instead, so focus would fall to the page. So if what had
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
   */
  #fontTheme() {
    return EditorView.theme({
      '&': { fontSize: `${this.textSize}px` },
      '.cm-scroller': {
        fontFamily: this.systemFont ? 'var(--editor-system-font-family)' : 'var(--editor-font-family)',
      },
    });
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('textSize') || changed.has('systemFont')) {
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
