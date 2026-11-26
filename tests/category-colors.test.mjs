import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { CATEGORY_PALETTE, CATEGORY_SUGGESTIONS, DEFAULT_CATEGORY_COLOR, normalizeHex, brightness, readableOn, colorName, isDuplicateName, freeSuggestions, isDeepColor, categoryEmoji } = load('lib/category-colors');

test('normalizeHex expands short hex, lower-cases, adds # and falls back on garbage', () => {
  assert.equal(normalizeHex('#F97316'), '#f97316');
  assert.equal(normalizeHex('f00'), '#ff0000');
  assert.equal(normalizeHex('#0F0'), '#00ff00');
  assert.equal(normalizeHex('  #3B82F6 '), '#3b82f6');
  assert.equal(normalizeHex('red'), DEFAULT_CATEGORY_COLOR);
  assert.equal(normalizeHex(null), DEFAULT_CATEGORY_COLOR);
  assert.equal(normalizeHex('#12345', '#abcdef'), '#abcdef');
});

test('every palette colour is a valid, unique #rrggbb and has a name', () => {
  const values = CATEGORY_PALETTE.map((p) => p.value);
  for (const p of CATEGORY_PALETTE) { assert.match(p.value, /^#[0-9a-f]{6}$/); assert.ok(p.name); }
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.includes(DEFAULT_CATEGORY_COLOR), 'the default colour of a new category is in the palette');
  for (const s of CATEGORY_SUGGESTIONS) assert.match(s.value, /^#[0-9a-f]{6}$/);
});

test('readableOn picks white on dark colours and near-black on light ones', () => {
  assert.equal(readableOn('#111827'), '#ffffff');
  assert.equal(readableOn('#f97316'), '#ffffff');
  assert.equal(readableOn('#eab308'), '#111827');
  assert.equal(readableOn('#ffffff'), '#111827');
  assert.ok(brightness('#000000') < brightness('#ffffff'));
});

test('every palette colour keeps its check mark readable (white or dark, never washed out)', () => {
  for (const p of CATEGORY_PALETTE) {
    const on = readableOn(p.value);
    const b = brightness(p.value);
    assert.ok(on === '#ffffff' ? b <= 165 : b > 165, p.name);
  }
});

test('colorName names palette colours in any notation and calls the rest "Warna khusus"', () => {
  assert.equal(colorName('#F97316'), 'Jingga');
  assert.equal(colorName('#111827'), 'Arang');
  assert.equal(colorName('#123456'), 'Warna khusus');
});

test('isDuplicateName ignores case and spaces, and never counts the category being edited', () => {
  const list = [{ id: 'a', name: 'Mie' }, { id: 'b', name: 'Minuman' }];
  assert.equal(isDuplicateName('  mie ', list), true);
  assert.equal(isDuplicateName('Camilan', list), false);
  assert.equal(isDuplicateName('Mie', list, 'a'), false);
  assert.equal(isDuplicateName('Mie', list, 'b'), true);
  assert.equal(isDuplicateName('   ', list), false);
});

test('freeSuggestions hides names that already exist and respects the limit', () => {
  const all = freeSuggestions([], 99).map((s) => s.name);
  assert.deepEqual(all, CATEGORY_SUGGESTIONS.map((s) => s.name));
  const left = freeSuggestions([{ name: 'mie' }, { name: 'Minuman ' }], 99).map((s) => s.name);
  assert.ok(!left.includes('Mie') && !left.includes('Minuman'));
  assert.equal(freeSuggestions([], 3).length, 3);
});

test('isDeepColor flags only the very dark colours that would vanish on the dark theme', () => {
  assert.equal(isDeepColor(DEFAULT_CATEGORY_COLOR), true);
  assert.equal(isDeepColor('#000000'), true);
  assert.equal(isDeepColor('#ff5a2c'), false);
  assert.equal(isDeepColor('#eab308'), false);
  assert.equal(isDeepColor('#ffffff'), false);
});

test('categoryEmoji picks a fitting emoji from the category name, case-insensitive', () => {
  assert.equal(categoryEmoji('Mie'), '🍜');
  assert.equal(categoryEmoji('MIE AYAM'), '🍜');
  assert.equal(categoryEmoji('Minuman'), '🥤');
  assert.equal(categoryEmoji('Es teh manis'), '🥤');
  assert.equal(categoryEmoji('Camilan'), '🍟');
  assert.equal(categoryEmoji('Topping'), '🥚');
  assert.equal(categoryEmoji('Dessert'), '🍰');
  assert.equal(categoryEmoji('Es krim'), '🍰');
  assert.equal(categoryEmoji('Nasi goreng'), '🍚');
  assert.equal(categoryEmoji('Paket hemat'), '🎁');
  assert.equal(categoryEmoji('Paket mie'), '🎁');
});

test('categoryEmoji gives a plate for unknown, empty or missing names', () => {
  assert.equal(categoryEmoji('Lainnya'), '🍽️');
  assert.equal(categoryEmoji(''), '🍽️');
  assert.equal(categoryEmoji(null), '🍽️');
  assert.equal(categoryEmoji(undefined), '🍽️');
});
