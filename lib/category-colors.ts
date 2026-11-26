/** Palette, suggestions and colour maths for the category form (components/shared/category-modal.tsx). Pure: no React, no browser. */

export const DEFAULT_CATEGORY_COLOR = '#111827';

export type Swatch = { name: string; value: string };

/** Curated colours, all readable as a tile on both the light and the dark theme. */
export const CATEGORY_PALETTE: Swatch[] = [
  { name: 'Arang', value: '#111827' },
  { name: 'Jingga', value: '#f97316' },
  { name: 'Merah', value: '#ef4444' },
  { name: 'Mawar', value: '#ec4899' },
  { name: 'Ungu', value: '#8b5cf6' },
  { name: 'Biru', value: '#3b82f6' },
  { name: 'Tosca', value: '#14b8a6' },
  { name: 'Hijau', value: '#22c55e' },
  { name: 'Kuning', value: '#eab308' },
  { name: 'Cokelat', value: '#a8561f' },
  { name: 'Abu', value: '#64748b' },
];

/** One-tap names for a new category; each carries the colour it usually gets. */
export const CATEGORY_SUGGESTIONS: Swatch[] = [
  { name: 'Mie', value: '#f97316' },
  { name: 'Minuman', value: '#3b82f6' },
  { name: 'Camilan', value: '#eab308' },
  { name: 'Topping', value: '#22c55e' },
  { name: 'Dessert', value: '#ec4899' },
  { name: 'Paket hemat', value: '#8b5cf6' },
];

/** Any CSS hex (#abc, #aabbcc, with or without #, any case) → lower-case #rrggbb. Anything else → the fallback. */
export function normalizeHex(input: unknown, fallback = DEFAULT_CATEGORY_COLOR): string {
  const raw = String(input ?? '').trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(raw)) return '#' + raw.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{6}$/.test(raw)) return '#' + raw;
  return fallback;
}

/** Perceived brightness 0–255 of a colour. */
export function brightness(hex: string): number {
  const h = normalizeHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Icon / check colour that stays readable on top of the given background colour. */
export function readableOn(hex: string): string {
  return brightness(hex) > 165 ? '#111827' : '#ffffff';
}

/** Name of a palette colour, or 'Warna khusus' for anything else. */
export function colorName(hex: string): string {
  const h = normalizeHex(hex);
  return CATEGORY_PALETTE.find((p) => p.value === h)?.name ?? 'Warna khusus';
}

/** True when another category (not `selfId`) already has this name, ignoring case and surrounding spaces. */
export function isDuplicateName(name: string, categories: { id?: string; name: string }[], selfId?: string | null): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return categories.some((c) => c.id !== selfId && String(c.name || '').trim().toLowerCase() === key);
}

/** Suggestions that are not taken yet, at most `limit`. */
export function freeSuggestions(categories: { name: string }[], limit = 5): Swatch[] {
  const taken = new Set(categories.map((c) => String(c.name || '').trim().toLowerCase()));
  return CATEGORY_SUGGESTIONS.filter((s) => !taken.has(s.name.toLowerCase())).slice(0, limit);
}

/** True for very dark colours (the default "Arang"): on the dark theme such a colour would vanish into the card, so Kasir lightens it there. */
export function isDeepColor(hex: string): boolean {
  return brightness(hex) < 70;
}

/**
 * One emoji that stands for a category (or a dish of that category) in Kasir: on the category pills and as the picture of a menu item that has no photo.
 * Matched on the name, case-insensitive; the first rule that fits wins, so "Mie ayam" is a noodle bowl and "Paket mie" a gift box. Unknown names get a plate.
 */
const EMOJI_RULES: [RegExp, string][] = [
  [/paket|hemat|combo|bundle/, '🎁'],
  [/dessert|es krim|ice cream|pudding|kue|cake|roti/, '🍰'],
  [/topping|tambahan|extra|telur/, '🥚'],
  [/minum|\bes\b|kopi|teh|jus|susu|boba|coffee|drink/, '🥤'],
  [/\bmi\b|mie|bakmi|ramen|pangsit|bakso|soto/, '🍜'],
  [/nasi|rice/, '🍚'],
  [/ayam|chicken|geprek/, '🍗'],
  [/camil|cemil|snack|goreng|keripik|kentang/, '🍟'],
];

export function categoryEmoji(name: unknown): string {
  const n = String(name ?? '').trim().toLowerCase();
  return EMOJI_RULES.find(([rule]) => rule.test(n))?.[1] ?? '🍽️';
}

