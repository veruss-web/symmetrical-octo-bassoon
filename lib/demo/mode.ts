/**
 * Demo mode controller: one demo at a time, held in memory only. `lib/supabase.ts` asks `getDemoClient()` on every call: while a demo runs the
 * whole app talks to the in-memory database instead of Supabase, so nothing a visitor does can reach (or change) real data.
 */
import { createMockSupabase, isMockChannel, type MockSupabase } from './mock-supabase';
import { buildDemoSeed } from './seed';

export { isMockChannel };

/** How long a demo lasts. */
export const DEMO_DURATION_MS = 5 * 60 * 1000;
export const DEMO_USER_ID = 'demo-user';
export const DEMO_EMAIL = 'demo@mieflow.app';

type Running = { client: MockSupabase; endsAt: number; run: number };
let current: Running | null = null;
let runs = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export const isDemoActive = (): boolean => current !== null;
export const getDemoClient = (): MockSupabase | null => (current ? current.client : null);
export const subscribeDemo = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Starts a fresh demo (a running one is discarded first, so "start again" really resets everything). */
export function startDemo(now: number = Date.now()) {
  if (current) { current.client.dispose(); current = null; }
  runs += 1;
  const client = createMockSupabase(buildDemoSeed(now, DEMO_USER_ID), { userId: DEMO_USER_ID, email: DEMO_EMAIL, onSignOut: () => stopDemo() });
  current = { client, endsAt: now + DEMO_DURATION_MS, run: runs };
  notify();
  return { endsAt: current.endsAt, run: current.run };
}

/** Ends the demo and throws every bit of its data away. */
export function stopDemo() {
  if (!current) return;
  current.client.dispose();
  current = null;
  notify();
}

export const remainingMs = (endsAt: number, now: number = Date.now()): number => Math.max(0, endsAt - now);

/** 4:05 style clock for the countdown (rounds up, so it only shows 0:00 when time is really over). */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
