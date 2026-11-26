import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { BRANCHES, OPEN_DELAY_MS, SLOW_OPEN_MS, hostOf, currentBranch, originOf, branchOrigins, branchLinkTarget, branchSpeculationRules } = load('lib/branches');

test('there are three websites: pusat, cabang 1 and cabang 2, each with its own https link', () => {
  assert.deepEqual(BRANCHES.map((b) => b.id), ['pusat', 'cabang-1', 'cabang-2']);
  assert.deepEqual(BRANCHES.map((b) => b.name), ['E-Commerce Pusat', 'Cabang 1', 'Cabang 2']);
  for (const b of BRANCHES) assert.match(b.url, /^https:\/\/[a-z0-9-]+\.vercel\.app\/$/);
  assert.equal(new Set(BRANCHES.map((b) => b.url)).size, 3);
});

test('hostOf extracts the lower-case hostname and tolerates garbage', () => {
  assert.equal(hostOf('https://Expert-System-Azure.vercel.app/'), 'expert-system-azure.vercel.app');
  assert.equal(hostOf('not a url'), '');
  assert.equal(hostOf(null), '');
  assert.equal(hostOf(undefined), '');
});

test('currentBranch recognises the open website by hostname', () => {
  assert.equal(currentBranch('legendary-tribble-eta.vercel.app')?.id, 'pusat');
  assert.equal(currentBranch('fictional-octo-tribble-delta.vercel.app')?.id, 'cabang-1');
  assert.equal(currentBranch('  EXPERT-SYSTEM-AZURE.vercel.app ')?.id, 'cabang-2');
});

test('currentBranch is null for localhost, other domains and empty input', () => {
  assert.equal(currentBranch('localhost'), null);
  assert.equal(currentBranch('toko-saya.example.com'), null);
  assert.equal(currentBranch(''), null);
  assert.equal(currentBranch(undefined), null);
});

test('originOf keeps scheme + host and rejects anything that is not http(s)', () => {
  assert.equal(originOf('https://expert-system-azure.vercel.app/some/path?x=1'), 'https://expert-system-azure.vercel.app');
  assert.equal(originOf('javascript:alert(1)'), '');
  assert.equal(originOf('not a url'), '');
  assert.equal(originOf(null), '');
});

test('branchOrigins lists each website once, ready for preconnect', () => {
  assert.deepEqual(branchOrigins(), [
    'https://legendary-tribble-eta.vercel.app',
    'https://fictional-octo-tribble-delta.vercel.app',
    'https://expert-system-azure.vercel.app',
  ]);
  const twice = [BRANCHES[0], { ...BRANCHES[0], id: 'cabang-1' }];
  assert.equal(branchOrigins(twice).length, 1);
});

test('branch links open in this tab, except while an order is open in the cashier', () => {
  assert.equal(branchLinkTarget(false), '_self');
  assert.equal(branchLinkTarget(true), '_blank');
});

test('branchSpeculationRules prefetches every other website and never the one that is open', () => {
  const rules = branchSpeculationRules('localhost');
  assert.deepEqual(rules, { prefetch: [{ source: 'list', urls: BRANCHES.map((b) => b.url), eagerness: 'immediate' }] });
  const onCabang2 = branchSpeculationRules(' EXPERT-SYSTEM-AZURE.vercel.app ');
  assert.deepEqual(onCabang2.prefetch[0].urls, [BRANCHES[0].url, BRANCHES[1].url]);
});

test('branchSpeculationRules is null when there is nothing to prefetch', () => {
  assert.equal(branchSpeculationRules('localhost', []), null);
  assert.equal(branchSpeculationRules('legendary-tribble-eta.vercel.app', [BRANCHES[0]]), null);
  assert.equal(branchSpeculationRules('localhost', [{ id: 'pusat', name: 'x', note: '', url: 'javascript:alert(1)' }]), null);
});

test('the slow-open screen offers Batal after a few seconds, not instantly and not forever', () => {
  assert.ok(SLOW_OPEN_MS >= 5000 && SLOW_OPEN_MS <= 15000);
});

test('the loading screen is shown for a calm moment before leaving: noticeable, but never annoying', () => {
  assert.ok(OPEN_DELAY_MS >= 1000 && OPEN_DELAY_MS <= 3000);
});
