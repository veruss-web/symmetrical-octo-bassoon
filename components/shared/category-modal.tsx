'use client';

/** Create/edit dialog for a category: live preview tile, name with one-tap suggestions, curated colour palette.
 *  Styles: app/category-modal.css. Pure helpers (palette, contrast, duplicate check): lib/category-colors.ts. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pipette, Tags, X } from 'lucide-react';
import {
  CATEGORY_PALETTE,
  DEFAULT_CATEGORY_COLOR,
  colorName,
  freeSuggestions,
  isDuplicateName,
  normalizeHex,
  readableOn,
} from '@/lib/category-colors';
import type { Category } from '@/lib/types';

const cssVars = (vars: Record<string, string>) => vars as unknown as React.CSSProperties;

export function CategoryModal({ initial, categories, onClose, onSave }: {
  initial: Category | null;
  categories: Category[];
  onClose: () => void;
  onSave: (type: 'category', form: any) => void | Promise<void>;
}) {
  const [name, setName] = useState<string>(initial?.name ?? '');
  const [color, setColor] = useState<string>(normalizeHex(initial?.color, DEFAULT_CATEGORY_COLOR));
  const [colorTouched, setColorTouched] = useState(Boolean(initial));
  const [saving, setSaving] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  // The parent passes a new onClose on every render; keeping it in a ref lets the effect below run once (no focus stealing on re-render).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const trimmed = name.trim();
  const duplicate = isDuplicateName(trimmed, categories, initial?.id);
  const suggestions = useMemo(() => (initial ? [] : freeSuggestions(categories)), [initial, categories]);
  const inPalette = CATEGORY_PALETTE.some((p) => p.value === color);
  const label = colorName(color);

  // Escape closes; on a laptop the name field is focused straight away, on a phone it is not (the keyboard would cover the palette).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) nameRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pickColor = (value: string) => { setColor(normalizeHex(value)); setColorTouched(true); };
  const pickSuggestion = (s: { name: string; value: string }) => {
    setName(s.name);
    setShowDuplicate(false);
    if (!colorTouched) setColor(s.value);
    nameRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!trimmed || duplicate) { setShowDuplicate(true); nameRef.current?.focus(); return; }
    setSaving(true);
    try { await onSave('category', { ...(initial || {}), name: trimmed, color }); }
    finally { setSaving(false); }
  };

  const invalid = showDuplicate && duplicate;

  return <motion.div className="modal-backdrop cat-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
    <motion.form
      className="modal cat-modal" role="dialog" aria-modal="true" aria-labelledby="cat-title"
      initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22, ease: 'easeOut' }}
      onMouseDown={(e) => e.stopPropagation()} onSubmit={submit} noValidate
    >
      <span className="cat-grip" aria-hidden="true"/>

      <header className="cat-head">
        <div>
          <h2 id="cat-title">{initial ? 'Ubah kategori' : 'Tambah kategori'}</h2>
          <p>{initial ? 'Perbarui nama dan warna kategori ini.' : 'Beri nama dan pilih warna agar mudah dikenali di Kasir.'}</p>
        </div>
        <button type="button" className="cat-close" aria-label="Tutup" onClick={onClose}><X size={18}/></button>
      </header>

      <div className="cat-body">
        <div className="cat-preview" style={cssVars({ '--cat-c': color, '--cat-on': readableOn(color) })} aria-live="polite">
          <span className="cat-preview-icon"><Tags size={22}/></span>
          <div className="cat-preview-copy">
            <b className={trimmed ? '' : 'is-empty'}>{trimmed || 'Nama kategori'}</b>
            <span><i/>{label} · {color.toUpperCase()}</span>
          </div>
        </div>

        <div className="cat-group">
          <label className="cat-label" htmlFor="cat-name">Nama kategori</label>
          <input
            id="cat-name" ref={nameRef} className="cat-input" value={name} maxLength={40} required autoComplete="off" enterKeyHint="done"
            placeholder="Contoh: Mie, Minuman, Camilan"
            aria-invalid={invalid || undefined} aria-describedby={invalid ? 'cat-name-error' : undefined}
            onChange={(e) => { setName(e.target.value); setShowDuplicate(false); }}
          />
          {invalid && <p id="cat-name-error" className="cat-hint is-error" role="alert">Kategori “{trimmed}” sudah ada. Gunakan nama lain.</p>}
          {suggestions.length > 0 && <>
            <p className="cat-hint">Atau pilih cepat</p>
            <div className="cat-suggest" role="group" aria-label="Saran nama kategori">
              {suggestions.map((s) => <button
                key={s.name} type="button" className="cat-chip" aria-pressed={trimmed.toLowerCase() === s.name.toLowerCase()}
                style={cssVars({ '--cat-c': s.value })} onClick={() => pickSuggestion(s)}
              ><i/>{s.name}</button>)}
            </div>
          </>}
        </div>

        <div className="cat-group">
          <div className="cat-label" id="cat-color-label">Warna</div>
          <div className="cat-swatches" role="radiogroup" aria-labelledby="cat-color-label">
            {CATEGORY_PALETTE.map((p) => {
              const on = p.value === color;
              return <button
                key={p.value} type="button" role="radio" aria-checked={on} aria-label={p.name} title={p.name}
                className={`cat-swatch${on ? ' is-on' : ''}`} style={cssVars({ '--cat-c': p.value, '--cat-on': readableOn(p.value) })}
                onClick={() => pickColor(p.value)}
              ><Check size={17} strokeWidth={3}/></button>;
            })}
            <label
              className={`cat-swatch cat-custom${inPalette ? '' : ' is-on'}`} title="Warna khusus"
              style={cssVars({ '--cat-c': inPalette ? '#8b5cf6' : color, '--cat-on': readableOn(color) })}
            >
              <input type="color" className="cat-color-native" value={color} aria-label="Pilih warna khusus" onChange={(e) => pickColor(e.target.value)}/>
              {inPalette ? <Pipette size={17}/> : <Check size={17} strokeWidth={3}/>}
            </label>
          </div>
        </div>
      </div>

      <footer className="cat-foot">
        <button type="button" className="cat-btn ghost" onClick={onClose}>Batal</button>
        <button type="submit" className="cat-btn solid" disabled={saving}>
          {saving ? 'Menyimpan…' : initial ? 'Simpan perubahan' : 'Simpan kategori'}{!saving && <Check size={18}/>}
        </button>
      </footer>
    </motion.form>
  </motion.div>;
}
