/**
 * The fonts the Preview's text can be shown in, over the Base Style's: Lato
 * (the default) or Inter, bundled from `src/fonts/`, or System, which leaves
 * the Base Style's own.
 */
export const PREVIEW_FONTS = [
  { id: 'lato', label: 'Lato' },
  { id: 'inter', label: 'Inter' },
  { id: 'system', label: 'System' },
] as const;

export type PreviewFontId = (typeof PREVIEW_FONTS)[number]['id'];

export const DEFAULT_PREVIEW_FONT: PreviewFontId = 'lato';

export function isPreviewFontId(value: unknown): value is PreviewFontId {
  return PREVIEW_FONTS.some((font) => font.id === value);
}
