/**
 * The Mieflow websites: the central e-commerce site and its branches.
 * Pure data + helpers (no React / browser imports), so they are unit-tested. The cards live in components/screens/settings.tsx.
 */
export type BranchId = 'pusat' | 'cabang-1' | 'cabang-2';

export type Branch = { id: BranchId; name: string; note: string; url: string };

export const BRANCHES: Branch[] = [
  { id: 'pusat', name: 'E-Commerce Pusat', note: 'Website pusat', url: 'https://legendary-tribble-eta.vercel.app/' },
  { id: 'cabang-1', name: 'Cabang 1', note: 'Website cabang pertama', url: 'https://fictional-octo-tribble-delta.vercel.app/' },
  { id: 'cabang-2', name: 'Cabang 2', note: 'Website cabang kedua', url: 'https://expert-system-azure.vercel.app/' },
];

/** "https://expert-system-azure.vercel.app/" -> "expert-system-azure.vercel.app". Returns '' for anything that is not a URL. */
export const hostOf = (url: unknown): string => {
  try {
    return new URL(String(url ?? '')).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/** The branch whose website is open right now (`window.location.hostname`), or null (localhost, a custom domain, ...). */
export function currentBranch(hostname: unknown, branches: Branch[] = BRANCHES): Branch | null {
  const host = String(hostname ?? '').trim().toLowerCase();
  if (!host) return null;
  return branches.find((b) => hostOf(b.url) === host) || null;
}

/** "https://expert-system-azure.vercel.app/x" -> "https://expert-system-azure.vercel.app". Returns '' for anything that is not an http(s) URL. */
export const originOf = (url: unknown): string => {
  try {
    const u = new URL(String(url ?? ''));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : '';
  } catch {
    return '';
  }
};

/** Each distinct origin once; used by app/layout.tsx so the browser opens the connection to every branch before anyone taps it. */
export const branchOrigins = (branches: Branch[] = BRANCHES): string[] =>
  Array.from(new Set(branches.map((b) => originOf(b.url)).filter(Boolean)));

/**
 * How a branch link opens. Same tab by default: the browser keeps the current page on screen until the branch answers,
 * so there is no blank / black new tab. While an order is open in the cashier it must go in a new tab instead, because the
 * cart only lives in this tab (and its stock is already reserved in the database): leaving the page would throw it away.
 */
export const branchLinkTarget = (hasOpenOrder: boolean): '_self' | '_blank' => (hasOpenOrder ? '_blank' : '_self');

/**
 * How long the "Membuka cabang" loading screen is shown before the browser is sent to the branch website (ms).
 * Deliberately not instant: the animated screen reads as a calm, intentional transition instead of a flash. Change this one number to
 * make it shorter or longer. Branch links that open in a new tab (an order is open in the cashier) skip it: a delayed window.open is blocked by pop-up blockers.
 */
export const OPEN_DELAY_MS = 1800;

/** Counted from the moment the browser is sent away: that long without an answer and the loading screen says the connection is slow. */
export const SLOW_OPEN_MS = 8000;

export type SpeculationRules = { prefetch: { source: 'list'; urls: string[]; eagerness: 'immediate' }[] };

/**
 * Chrome "Speculation Rules": while the Settings screen is open the browser downloads the HTML of the other websites in the
 * background, so a tap does not wait for the first byte. It is a hint only (browsers without support simply ignore it).
 * `currentHost` (window.location.hostname) is left out: a site never prefetches itself. Returns null when there is nothing to prefetch.
 */
export const branchSpeculationRules = (currentHost: unknown, branches: Branch[] = BRANCHES): SpeculationRules | null => {
  const here = String(currentHost ?? '').trim().toLowerCase();
  const urls = branches.filter((b) => originOf(b.url) && hostOf(b.url) !== here).map((b) => b.url);
  return urls.length ? { prefetch: [{ source: 'list', urls, eagerness: 'immediate' }] } : null;
};
