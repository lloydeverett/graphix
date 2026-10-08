/**
 * The fonts the Preview's text can be shown in, over the Base Style's: Lato
 * (the default), Inter, Schibsted Grotesk, Newsreader, Fraunces or Literata,
 * bundled from `src/fonts/`, or System UI or System Serif, the system's own.
 */
export const PREVIEW_FONTS = [
  { id: 'lato', label: 'Lato' },
  { id: 'inter', label: 'Inter' },
  { id: 'schibsted-grotesk', label: 'Schibsted Grotesk' },
  { id: 'newsreader', label: 'Newsreader' },
  { id: 'fraunces', label: 'Fraunces' },
  { id: 'literata', label: 'Literata' },
  { id: 'system-ui', label: 'System UI' },
  { id: 'system-serif', label: 'System Serif' },
] as const;

export type PreviewFontId = (typeof PREVIEW_FONTS)[number]['id'];

export const DEFAULT_PREVIEW_FONT: PreviewFontId = 'lato';

export function isPreviewFontId(value: unknown): value is PreviewFontId {
  return PREVIEW_FONTS.some((font) => font.id === value);
}
