/**
 * The fonts the Source can be shown in: Cascadia Code (the default), Cascadia
 * Mono (the same, without ligatures), Fira Code, JetBrains Mono or IBM Plex
 * Mono, bundled from `src/fonts/`, or System Mono, the system's monospace font.
 */
export const EDITOR_FONTS = [
  { id: 'cascadia-code', label: 'Cascadia Code' },
  { id: 'cascadia-mono', label: 'Cascadia Mono' },
  { id: 'fira-code', label: 'Fira Code' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono' },
  { id: 'system-mono', label: 'System Mono' },
] as const;

export type EditorFontId = (typeof EDITOR_FONTS)[number]['id'];

export const DEFAULT_EDITOR_FONT: EditorFontId = 'cascadia-code';

export function isEditorFontId(value: unknown): value is EditorFontId {
  return EDITOR_FONTS.some((font) => font.id === value);
}

/**
 * The CSS font-family to show the Source in. A bundled font is named by its
 * label, and falls back to the system's monospace font while it loads.
 */
export function editorFontFamily(id: EditorFontId) {
  const system = 'var(--editor-system-font-family)';
  if (id === 'system-mono') return system;
  return `'${EDITOR_FONTS.find((font) => font.id === id)!.label}', ${system}`;
}
