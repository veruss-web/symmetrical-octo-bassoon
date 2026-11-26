'use client';

/**
 * Demo mode UI, shown in the dashboard's top bar only while a demo runs (lib/demo/mode.ts):
 *  - a chip with the countdown (it turns amber in the last minute and red in the last 30 seconds),
 *  - a welcome guide that opens by itself at the start (what is safe to try, and where),
 *  - a full-screen "time is up" card with "again" / "finish" once the 5 minutes are over.
 * Styles: app/demo.css. The demo data itself lives only in memory (lib/demo/mock-supabase.ts), so nothing here has to clean up storage.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, LogOut, RotateCcw, Sparkles, Timer, X } from 'lucide-react';
import { DEMO_DURATION_MS, formatClock, remainingMs } from '@/lib/demo/mode';

export type DemoProps = { endsAt: number; onRestart: () => void; onExit: () => void };

const TIPS: [string, string][] = [
  ['Kasir', 'Pilih menu, pilih cara bayar, lalu Bayar untuk melihat struk.'],
  ['Produk', 'Tambah atau ubah menu, lengkap dengan foto dan stok.'],
  ['Kategori', 'Buat kategori dengan warna pilihan Anda.'],
  ['Pelanggan', 'Tambah pelanggan, lalu pilih saat membayar di Kasir.'],
  ['Inventori', 'Naikkan atau turunkan stok dengan satu ketukan.'],
  ['Riwayat dan Analisa', 'Lihat transaksi contoh; angkanya ikut bertambah setelah Anda bertransaksi.'],
];

export function DemoChip({ endsAt, onRestart, onExit }: DemoProps) {
  const [now, setNow] = useState(() => Date.now());
  const [guide, setGuide] = useState(true); // opens by itself once, at the start of every demo
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!guide) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setGuide(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guide]);

  const left = remainingMs(endsAt, now);
  const over = left <= 0;
  const level = left <= 30_000 ? 'danger' : left <= 60_000 ? 'warn' : 'ok';
  const progress = Math.round((Math.min(left, DEMO_DURATION_MS) / DEMO_DURATION_MS) * 100);

  return (
    <>
      <button
        type="button"
        className="demo-chip"
        data-level={level}
        aria-expanded={guide}
        aria-label={`Mode demo, sisa waktu ${formatClock(left)}. Buka panduan.`}
        onClick={() => setGuide((v) => !v)}
        style={{ ['--p' as any]: `${progress}%` }}
      >
        <span className="demo-chip-ring" aria-hidden="true"><Timer size={14} /></span>
        <span className="demo-chip-label">DEMO</span>
        <b role="timer" aria-live="off">{formatClock(left)}</b>
      </button>

      {guide && !over && createPortal(
        <div className="demo-pop" role="dialog" aria-label="Panduan mode demo">
          <button type="button" className="demo-pop-close" onClick={() => setGuide(false)} aria-label="Tutup panduan"><X size={16} /></button>
          <span className="demo-badge"><Sparkles size={13} /> MODE DEMO • 5 MENIT</span>
          <h3>Silakan coba semua fitur</h3>
          <p>Semua data di sini hanya contoh dan <b>tidak disimpan</b>. Saat waktu habis atau halaman dimuat ulang, semuanya kembali seperti awal.</p>
          <ol className="demo-tips">
            {TIPS.map(([title, text]) => (
              <li key={title}><span aria-hidden="true"><Check size={12} strokeWidth={3} /></span><div><b>{title}</b><small>{text}</small></div></li>
            ))}
          </ol>
          <div className="demo-pop-actions">
            <button type="button" className="demo-primary" onClick={() => setGuide(false)}>Mulai mencoba</button>
            <button type="button" className="demo-ghost" onClick={onRestart}><RotateCcw size={14} /> Ulangi dari awal</button>
            <button type="button" className="demo-ghost" onClick={onExit}><LogOut size={14} /> Keluar demo</button>
          </div>
        </div>,
        document.body,
      )}

      {over && createPortal(
        <div className="demo-end" role="alertdialog" aria-modal="true" aria-labelledby="demo-end-title">
          <div className="demo-end-card">
            <span className="demo-end-icon" aria-hidden="true"><Timer size={30} /></span>
            <h2 id="demo-end-title">Waktu demo habis</h2>
            <p>Terima kasih sudah mencoba Mieflow. Semua data contoh sudah dihapus dan tidak disimpan di mana pun.</p>
            <button type="button" className="demo-primary" onClick={onRestart} autoFocus><RotateCcw size={15} /> Coba lagi 5 menit</button>
            <button type="button" className="demo-ghost" onClick={onExit}>Selesai</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
