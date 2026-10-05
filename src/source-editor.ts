import { html as htmlLanguage } from '@codemirror/lang-html';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment } from '@codemirror/state';
import { tags } from '@lezer/highlight';
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
    fontSize: 'var(--editor-font-size)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--editor-font-family)', lineHeight: '1.5' },
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
});

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
  @property({ type: Boolean, reflect: true, attribute: 'system-font' }) systemFont = false;

  #wordWrapCompartment = new Compartment();

  #view?: EditorView;

  /** Set while `updated()` applies an outside `value`, which isn't an edit to report. */
  #applyingValue = false;

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.#view ??= new EditorView({
      parent: this,
      doc: this.value,
      extensions: [
        basicSetup,
        htmlLanguage(),
        syntaxHighlighting(highlightStyle),
        this.#wordWrapCompartment.of(this.#wordWrapExtension()),
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

  protected updated(changed: Map<PropertyKey, unknown>) {
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
