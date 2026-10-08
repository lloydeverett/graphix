/**
 * The fonts the Preview's text can be shown in, over the Base Style's:
 * Schibsted Grotesk (the default), Lato, Inter, Newsreader, Fraunces or
 * Literata, bundled from `src/fonts/`, or System UI or System Serif, the
 * system's own.
 */
export const PREVIEW_FONTS = [
  { id: 'schibsted-grotesk', label: 'Schibsted Grotesk' },
  { id: 'lato', label: 'Lato' },
  { id: 'inter', label: 'Inter' },
  { id: 'newsreader', label: 'Newsreader' },
  { id: 'fraunces', label: 'Fraunces' },
  { id: 'literata', label: 'Literata' },
  { id: 'system-ui', label: 'System UI' },
  { id: 'system-serif', label: 'System Serif' },
] as const;

export type PreviewFontId = (typeof PREVIEW_FONTS)[number]['id'];

export const DEFAULT_PREVIEW_FONT: PreviewFontId = 'schibsted-grotesk';

export function isPreviewFontId(value: unknown): value is PreviewFontId {
  return PREVIEW_FONTS.some((font) => font.id === value);
}
