import './globals.css';
import './dark-theme.generated.css';
import './dark-overrides.css';
import './analisa.css';
import './cabang.css';
import './category-modal.css';
import './kasir-menu.css';
import './demo.css';
// Last on purpose: it overrides slow transitions / blur from the files above (see the header of fast.css).
import './fast.css';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { branchOrigins } from '@/lib/branches';
import type { Metadata } from 'next';

function resolveSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  } catch {
    return new URL('http://localhost:3000');
  }
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: { default: 'MIEFLOW POS — Kasir & manajemen toko', template: '%s · MIEFLOW' },
  description:
    'Aplikasi kasir (POS) dan manajemen toko: produk, stok, pelanggan, transaksi, struk, dan analitik penjualan.',
  applicationName: 'MIEFLOW POS',
  manifest: '/manifest.webmanifest',
  // Back-office app behind a login: keep it out of search results.
  robots: { index: false, follow: false },
};

// Fonts are fetched in parallel with the stylesheet and never block the first paint (see FONTS_LOADER below).
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap';
const FONTS_LOADER = `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONTS_URL)};document.head.appendChild(l)})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Fonts are added by this tiny script instead of a <link rel="stylesheet">: a stylesheet link in <head> stops the browser from painting
            anything until fonts.googleapis.com has answered, which is a blank (black in dark mode) screen on a slow connection.
            This way the page paints at once with the system font and the real fonts swap in as soon as they arrive. */}
        <script dangerouslySetInnerHTML={{ __html: FONTS_LOADER }} />
        {/* DNS + TCP + TLS to every branch website is done before the tap, so opening one starts at the first byte. */}
        {branchOrigins().map((origin) => (
          <link key={origin} rel="preconnect" href={origin} />
        ))}
        {branchOrigins().map((origin) => (
          <link key={`dns-${origin}`} rel="dns-prefetch" href={origin} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
