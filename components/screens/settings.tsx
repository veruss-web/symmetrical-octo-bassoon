'use client';

/** Settings: appearance (light / dark / system), the websites of the central store and its branches, and the signed-in account. */
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Check, ExternalLink, LogOut, Monitor, Moon, Palette, ShieldCheck, Store, Sun } from 'lucide-react';
import { CustomerAvatar } from '@/components/shared/avatar';
import { BRANCHES, OPEN_DELAY_MS, SLOW_OPEN_MS, branchLinkTarget, branchSpeculationRules, currentBranch, hostOf } from '@/lib/branches';
import type { ResolvedTheme, ThemeMode } from '@/lib/theme';

const OPTIONS: { mode: ThemeMode; label: string; note: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Terang', note: 'Bersih dan cerah, nyaman di ruangan terang.', icon: Sun },
  { mode: 'dark', label: 'Gelap', note: 'Lembut di mata, pas untuk malam hari.', icon: Moon },
  { mode: 'system', label: 'Otomatis', note: 'Mengikuti pengaturan tema perangkat Anda.', icon: Monitor },
];

/** Little drawn app window; always uses its own fixed colors so every option previews its real look in either theme. */
function Preview({ variant }: { variant: 'light' | 'dark' | 'system' }) {
  const pane = (tone: 'light' | 'dark') => (
    <div className={`tp-pane ${tone}`}>
      <i className="tp-side"><b/><b/><b/></i>
      <div className="tp-main">
        <div className="tp-top"><b/><i/></div>
        <div className="tp-hero"/>
        <div className="tp-cards"><i/><i/><i/></div>
      </div>
    </div>
  );
  return <div className={`theme-preview ${variant}`} aria-hidden="true">{variant === 'system' ? <>{pane('light')}{pane('dark')}</> : pane(variant)}</div>;
}

export function Settings({ email, theme, resolvedTheme, onThemeChange, onSignOut, hasOpenOrder = false, showBranches = true }: {
  email: string; theme: ThemeMode; resolvedTheme: ResolvedTheme; onThemeChange: (mode: ThemeMode) => void; onSignOut: () => void;
  /** An order is open in the cashier: branch links then open in a new tab so the cart (and its reserved stock) is not lost. */
  hasOpenOrder?: boolean;
  /** false in the demo: the cards lead to the real branch websites, which a demo visitor must not leave to. */
  showBranches?: boolean;
}) {
  // Id of the branch being opened in this tab. Tapping a card shows a full-screen loading screen at once; the browser is sent to the
  // branch after OPEN_DELAY_MS, so the move reads as a calm, intentional transition (and the page is prefetched in the meantime).
  const [going, setGoing] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [slow, setSlow] = useState(false);
  const cancelOpen = () => {
    try { window.stop(); } catch { /* old browsers: just hide the screen */ }
    setGoing(null);
  };
  useEffect(() => {
    // Coming back with the browser's back button restores this page from memory with `going` still set.
    const reset = () => setGoing(null);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);
  useEffect(() => {
    const branch = BRANCHES.find((b) => b.id === going);
    if (!branch) { setStage(0); setSlow(false); return; }
    setStage(0);
    setSlow(false);
    // Cosmetic steps spread over the delay; then the real navigation; much later, if the site still has not answered, the slow notice.
    const timers = [
      window.setTimeout(() => setStage(1), OPEN_DELAY_MS * 0.3),
      window.setTimeout(() => setStage(2), OPEN_DELAY_MS * 0.65),
      window.setTimeout(() => window.location.assign(branch.url), OPEN_DELAY_MS),
      window.setTimeout(() => setSlow(true), OPEN_DELAY_MS + SLOW_OPEN_MS),
    ];
    // Never trap anyone under the screen: Batal and Esc always work (cleanup below also cancels the pending navigation).
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelOpen(); };
    window.addEventListener('keydown', onKey);
    return () => { timers.forEach((t) => window.clearTimeout(t)); window.removeEventListener('keydown', onKey); };
  }, [going]);
  useEffect(() => {
    // While Settings is open the browser may already download the other websites' pages in the background (Chrome; ignored elsewhere).
    const rules = branchSpeculationRules(window.location.hostname);
    const supports = (HTMLScriptElement as unknown as { supports?: (type: string) => boolean }).supports;
    if (!rules || !supports || !supports.call(HTMLScriptElement, 'speculationrules')) return;
    const el = document.createElement('script');
    el.type = 'speculationrules';
    el.textContent = JSON.stringify(rules);
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
  const target = branchLinkTarget(hasOpenOrder);
  const goingBranch = BRANCHES.find((b) => b.id === going) || null;
  const active = OPTIONS.find((o) => o.mode === theme) || OPTIONS[0];
  // This screen only renders after sign-in (client side), so reading the address bar here is safe.
  const here = currentBranch(typeof window === 'undefined' ? '' : window.location.hostname);
  return <div className="st-page">
    <section className="st-hero">
      <span className="st-eyebrow"><Palette size={13}/> Personalisasi</span>
      <h2>Atur tampilan sesuai gaya Anda</h2>
      <p>Pilih tema yang paling nyaman. Perubahan langsung berlaku di seluruh aplikasi dan diingat di perangkat ini.</p>
    </section>

    <section className="st-card">
      <div className="st-card-head">
        <div><span className="st-kicker">Tampilan</span><h3>Tema aplikasi</h3></div>
        <span className="st-status"><i data-tone={resolvedTheme}/>Aktif sekarang: <b>{resolvedTheme === 'dark' ? 'Gelap' : 'Terang'}</b>{theme === 'system' ? ' (otomatis)' : ''}</span>
      </div>
      <div className="st-themes" role="radiogroup" aria-label="Tema aplikasi">
        {OPTIONS.map(({ mode, label, note, icon: Icon }) => {
          const selected = theme === mode;
          return <button type="button" key={mode} role="radio" aria-checked={selected} className={`st-theme ${selected ? 'selected' : ''}`} onClick={() => onThemeChange(mode)}>
            <Preview variant={mode}/>
            <span className="st-theme-info">
              <span className="st-theme-icon"><Icon size={17}/></span>
              <span className="st-theme-copy"><b>{label}</b><small>{note}</small></span>
              <span className="st-theme-check">{selected && <Check size={14}/>}</span>
            </span>
          </button>;
        })}
      </div>
      <p className="st-hint">Anda juga bisa mengganti tema kapan saja lewat tombol matahari/bulan di bilah atas. Pilihan saat ini: <b>{active.label}</b>.</p>
    </section>

    {showBranches && <section className="st-card">
      <div className="st-card-head">
        <div><span className="st-kicker">Cabang</span><h3>Website pusat dan cabang</h3></div>
        <span className="st-status"><Store size={14}/> <b>{BRANCHES.length}</b> website</span>
      </div>
      <div className="br-list">
        {BRANCHES.map((b) => {
          const open = b.id === here?.id;
          const opening = going === b.id;
          const body = <>
            <span className="br-icon">{b.id === 'pusat' ? <Building2 size={20}/> : <Store size={20}/>}</span>
            <span className="br-copy"><b>{b.name}</b><small>{opening ? 'Membuka…' : hostOf(b.url)}</small></span>
            {open ? <span className="br-badge"><i/>Sedang dibuka</span> : <span className="br-go">{opening ? <i className="br-spin"/> : <ExternalLink size={16}/>}</span>}
          </>;
          return open
            ? <div key={b.id} className="br-card here" aria-current="true">{body}</div>
            : target === '_blank'
              ? <a key={b.id} className="br-card" href={b.url} target="_blank" rel="noopener noreferrer" aria-label={`Buka ${b.name} di tab baru`}>{body}</a>
              : <a key={b.id} className="br-card" href={b.url} aria-label={`Buka ${b.name}`} aria-busy={opening} onClick={(e) => { if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); setGoing(b.id); }}>{body}</a>;
        })}
      </div>
      <p className="st-hint">{target === '_blank' ? 'Ada pesanan yang belum dibayar di Kasir, jadi websitenya dibuka di tab baru agar pesanan tidak hilang.' : 'Ketuk salah satu untuk langsung masuk ke websitenya. Tombol kembali di browser membawa Anda ke sini lagi.'}</p>
    </section>}

    <section className="st-card st-account">
      <div className="st-card-head">
        <div><span className="st-kicker">Akun</span><h3>Sesi masuk</h3></div>
        <span className="st-status st-secure"><ShieldCheck size={14}/> Terautentikasi</span>
      </div>
      <div className="st-account-row">
        <CustomerAvatar name={email || 'A'} size="lg"/>
        <div className="st-account-copy"><b>{email || 'Pengguna'}</b><small>Anda masuk sebagai pemilik toko.</small></div>
        <button type="button" className="st-signout" onClick={onSignOut}><LogOut size={16}/> Keluar</button>
      </div>
    </section>
    {goingBranch && createPortal(
      <div className="br-overlay" role="status" aria-live="polite" style={{ '--br-dur': `${OPEN_DELAY_MS}ms` } as CSSProperties}>
        <div className="br-ov-card">
          <span className="br-ov-logo">
            <i className="br-ov-ring"/><i className="br-ov-ring br-ov-ring-2"/>
            <span className="br-ov-mark">{goingBranch.id === 'pusat' ? <Building2 size={30}/> : <Store size={30}/>}</span>
          </span>
          <small className="br-ov-kicker">Membuka cabang</small>
          <b className="br-ov-name">{goingBranch.name}</b>
          <small className="br-ov-host">{hostOf(goingBranch.url)}</small>
          <ul className="br-ov-steps">
            {[ 'Menyiapkan koneksi aman', 'Menghubungi website cabang', `Membuka ${goingBranch.name}` ].map((label, i) => (
              <li key={label} className={i < stage ? 'done' : i === stage ? 'now' : ''}>
                <span className="br-ov-dot">{i < stage ? <Check size={11} strokeWidth={3}/> : i === stage ? <i className="br-spin"/> : null}</span>{label}
              </li>
            ))}
          </ul>
          <i className="br-ov-bar"/>
          <p className="br-ov-note">{slow ? 'Koneksi agak lambat, masih menunggu websitenya menjawab.' : 'Sebentar ya, Anda akan dialihkan otomatis.'}</p>
          <button type="button" className="br-ov-cancel" onClick={cancelOpen}>Batal</button>
        </div>
      </div>,
      document.body,
    )}
  </div>;
}
