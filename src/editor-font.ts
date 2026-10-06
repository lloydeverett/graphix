/**
 * The fonts the Source can be shown in: Cascadia Code (the default), Cascadia
 * Mono (the same, without ligatures), Fira Code or JetBrains Mono, bundled from
 * `src/fonts/`, or System Mono, the system's monospace font. Each falls back to the system's while it loads.
 */
export const EDITOR_FONTS = [
  { id: 'cascadia-code', label: 'Cascadia Code', family: "'Cascadia Code', var(--editor-system-font-family)" },
  { id: 'cascadia-mono', label: 'Cascadia Mono', family: "'Cascadia Mono', var(--editor-system-font-family)" },
  { id: 'fira-code', label: 'Fira Code', family: "'Fira Code', var(--editor-system-font-family)" },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', family: "'JetBrains Mono', var(--editor-system-font-family)" },
  { id: 'system-mono', label: 'System Mono', family: 'var(--editor-system-font-family)' },
] as const;

export type EditorFontId = (typeof EDITOR_FONTS)[number]['id'];

export const DEFAULT_EDITOR_FONT: EditorFontId = 'cascadia-code';

export function isEditorFontId(value: unknown): value is EditorFontId {
  return EDITOR_FONTS.some((font) => font.id === value);
}

/** The CSS font-family to show the Source in. */
export function editorFontFamily(id: EditorFontId) {
  return EDITOR_FONTS.find((font) => font.id === id)!.family;
}
