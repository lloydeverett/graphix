import { html as htmlLanguage } from '@codemirror/lang-html';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
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
    fontSize: '14px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'ui-monospace, monospace', lineHeight: '1.5' },
  '.cm-content': { padding: '16px 0', caretColor: 'var(--fg)' },
  '.cm-line': { padding: '0 16px 0 8px' },
  '.cm-cursor': { borderLeftColor: 'var(--fg)' },
  '.cm-gutters': {
    background: 'var(--surface)',
    color: 'var(--syntax-comment)',
    border: 'none',
  },
  '.cm-activeLine, .cm-activeLineGutter': { background: 'var(--active-line)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'var(--selection)',
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
        EditorView.lineWrapping,
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

  protected updated(changed: Map<PropertyKey, unknown>) {
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
