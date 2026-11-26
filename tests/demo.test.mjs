import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { createMockSupabase, isMockChannel } = load('lib/demo/mock-supabase');
const { buildDemoSeed, seededRandom } = load('lib/demo/seed');
const { demoPhoto } = load('lib/demo/photos');
const { DEMO_DURATION_MS, DEMO_USER_ID, startDemo, stopDemo, isDemoActive, getDemoClient, subscribeDemo, remainingMs, formatClock } = load('lib/demo/mode');

const NOW = new Date('2026-11-16T10:00:00Z').getTime();
const UID = 'u-test';
const fresh = (extra = {}) => createMockSupabase(buildDemoSeed(NOW, UID), { userId: UID, email: 'demo@mieflow.app', clock: () => NOW, ...extra });
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

test('the demo seed is a complete, consistent sample shop', () => {
  const seed = buildDemoSeed(NOW, UID);
  assert.equal(seed.categories.length, 5);
  assert.equal(seed.products.length, 18);
  assert.equal(seed.customers.length, 8);
  assert.ok(seed.orders.length >= 50, 'a believable history');
  for (const table of Object.values(seed)) for (const row of table) assert.equal(row.owner_id, UID);
  const categoryIds = new Set(seed.categories.map((c) => c.id));
  for (const p of seed.products) assert.ok(categoryIds.has(p.category_id), `${p.name} has a real category`);
  const orderIds = new Set(seed.orders.map((o) => o.id));
  for (const item of seed.order_items) assert.ok(orderIds.has(item.order_id));
  for (const o of seed.orders) {
    const sum = seed.order_items.filter((i) => i.order_id === o.id).reduce((a, i) => a + i.line_total, 0);
    assert.equal(o.total, sum, `${o.order_number} total matches its items`);
    assert.ok(o.amount_paid >= o.total && o.change_due === o.amount_paid - o.total);
    assert.ok(new Date(o.created_at).getTime() <= NOW, 'no order in the future');
  }
  assert.equal(new Set(seed.orders.map((o) => o.order_number)).size, seed.orders.length, 'order numbers are unique');
  assert.ok(seed.orders.some((o) => NOW - new Date(o.created_at).getTime() < 86400000), 'something sold today');
});

test('the seed shows every stock state and both photo and photo-less menu items', () => {
  const { products } = buildDemoSeed(NOW, UID);
  assert.ok(products.some((p) => p.stock === 0), 'an out-of-stock item');
  assert.ok(products.some((p) => p.stock > 0 && p.stock < 5), 'a low-stock item');
  assert.ok(products.some((p) => p.stock >= 5));
  assert.ok(products.some((p) => p.image_url?.startsWith('data:image/svg+xml')));
  assert.ok(products.some((p) => p.image_url === null));
});

test('the seed is deterministic for a given time', () => {
  assert.deepEqual(buildDemoSeed(NOW, UID), buildDemoSeed(NOW, UID));
  const a = seededRandom(1), b = seededRandom(1);
  assert.equal(a(), b());
});

test('every demo photo is a small, valid SVG data URI', () => {
  for (const kind of ['noodle', 'noodle-bakso', 'noodle-ceker', 'noodle-red', 'noodle-seafood', 'noodle-mushroom', 'tea', 'orange', 'coffee', 'fries', 'dumpling', 'tofu', 'combo']) {
    const uri = demoPhoto(kind);
    assert.ok(uri.startsWith('data:image/svg+xml;charset=utf-8,'));
    const svg = decodeURIComponent(uri.split(',').slice(1).join(','));
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
    assert.ok(uri.length < 12000, `${kind} stays small`);
  }
});

test('select filters, orders, limits and projects columns like PostgREST', async () => {
  const db = fresh();
  const all = await db.from('products').select('*').eq('owner_id', UID).order('name');
  assert.equal(all.error, null);
  assert.equal(all.data.length, 18);
  assert.deepEqual(all.data.map((p) => p.name), [...all.data.map((p) => p.name)].sort());
  const top = await db.from('orders').select('*').eq('owner_id', UID).order('created_at', { ascending: false }).limit(3);
  assert.equal(top.data.length, 3);
  assert.ok(top.data[0].created_at >= top.data[1].created_at);
  const stock = await db.from('products').select('stock').eq('id', 'demo-p-ayam').maybeSingle();
  assert.deepEqual(stock.data, { stock: 40 });
  assert.equal((await db.from('products').select('*').eq('owner_id', 'someone-else')).data.length, 0);
  const none = await db.from('products').select('*').eq('id', 'nope').maybeSingle();
  assert.deepEqual([none.data, none.error], [null, null]);
  assert.equal((await db.from('products').select('*').eq('id', 'nope').single()).error.code, 'PGRST116');
});

test('insert returns the new row, fills defaults and enforces the same rules as the database', async () => {
  const db = fresh();
  const made = await db.from('categories').insert({ name: 'Dessert', color: '#ec4899', owner_id: UID }).select().single();
  assert.equal(made.error, null);
  assert.ok(made.data.id && made.data.created_at);
  const dup = await db.from('categories').insert({ name: 'Mie', color: '#000000', owner_id: UID }).select().single();
  assert.match(dup.error.message, /duplicate key/);
  const noName = await db.from('customers').insert({ name: '  ', owner_id: UID }).select().single();
  assert.equal(noName.error.code, '23502');
  const bad = await db.from('products').insert({ name: 'X', price: -1, stock: 1, owner_id: UID }).select('*').single();
  assert.equal(bad.error.code, '23514');
  const fraction = await db.from('products').insert({ name: 'X', price: 1, stock: 1.5, owner_id: UID }).select('*').single();
  assert.equal(fraction.error.code, '23514');
  const product = await db.from('products').insert({ name: 'Bakmi Baru', price: 17000, stock: 9, category_id: made.data.id, owner_id: UID }).select('*').single();
  assert.deepEqual([product.data.is_active, product.data.cost, product.data.image_url], [true, 0, null]);
  assert.equal((await db.from('products').select('*').eq('owner_id', UID)).data.length, 19);
  const foreign = await db.from('products').insert({ name: 'Z', price: 1, stock: 1, owner_id: 'someone-else' }).select('*').single();
  assert.equal(foreign.error.code, '42501', 'rows for another owner are refused, like RLS');
});

test('update changes only matching rows; the optimistic stock check from Inventory works', async () => {
  const db = fresh();
  const ok = await db.from('products').update({ stock: 41 }).eq('id', 'demo-p-ayam').eq('owner_id', UID).eq('stock', 40).select('stock');
  assert.deepEqual(ok.data, [{ stock: 41 }]);
  const stale = await db.from('products').update({ stock: 99 }).eq('id', 'demo-p-ayam').eq('owner_id', UID).eq('stock', 40).select('stock');
  assert.deepEqual(stale.data, [], 'a stale value updates nothing');
  const renamed = await db.from('categories').update({ name: 'Mie Spesial', color: '#111111' }).eq('id', 'demo-c-mie').eq('owner_id', UID).select().single();
  assert.equal(renamed.data.name, 'Mie Spesial');
  const clash = await db.from('categories').update({ name: 'Minuman' }).eq('id', 'demo-c-mie').eq('owner_id', UID).select().single();
  assert.match(clash.error.message, /duplicate key/);
  const missing = await db.from('customers').update({ name: 'X' }).eq('id', 'nope').eq('owner_id', UID).select().single();
  assert.equal(missing.error.code, 'PGRST116');
});

test('delete follows the database rules: set null for references, cascade for order items', async () => {
  const db = fresh();
  await db.from('categories').delete().eq('id', 'demo-c-minuman').eq('owner_id', UID);
  const teh = await db.from('products').select('*').eq('id', 'demo-p-teh').single();
  assert.equal(teh.data.category_id, null);
  await db.from('customers').delete().eq('id', 'demo-u-1').eq('owner_id', UID);
  assert.ok(db.snapshot('orders').every((o) => o.customer_id !== 'demo-u-1'));
  await db.from('products').delete().eq('id', 'demo-p-ayam').eq('owner_id', UID);
  assert.ok(db.snapshot('order_items').every((i) => i.product_id !== 'demo-p-ayam'));
  assert.ok(db.snapshot('order_items').some((i) => i.product_name === 'Mie Ayam Spesial'), 'history keeps the item name');
  const firstOrder = db.snapshot('orders')[0];
  await db.from('orders').delete().eq('id', firstOrder.id).eq('owner_id', UID);
  assert.ok(db.snapshot('order_items').every((i) => i.order_id !== firstOrder.id));
});

test('adjust_product_stock reserves and releases stock and refuses to go below zero', async () => {
  const db = fresh();
  assert.deepEqual((await db.rpc('adjust_product_stock', { p_product_id: 'demo-p-ayam', p_quantity_delta: -3 })).data, { id: 'demo-p-ayam', stock: 37 });
  assert.deepEqual((await db.rpc('adjust_product_stock', { p_product_id: 'demo-p-ayam', p_quantity_delta: 1 })).data, { id: 'demo-p-ayam', stock: 38 });
  const tooMuch = await db.rpc('adjust_product_stock', { p_product_id: 'demo-p-ceker', p_quantity_delta: -5 });
  assert.match(tooMuch.error.message, /Stok Mie Ayam Ceker tidak mencukupi \(tersisa 4\)/);
  assert.match((await db.rpc('adjust_product_stock', { p_product_id: 'nope', p_quantity_delta: -1 })).error.message, /Produk tidak ditemukan/);
  assert.match((await db.rpc('adjust_product_stock', { p_product_id: 'demo-p-ayam', p_quantity_delta: 0 })).error.message, /tidak valid/);
  assert.equal(db.snapshot('stock_movements').length, 2, 'every successful change leaves a movement');
});

test('create_sale makes the order and its items, computes change and does not touch stock again', async () => {
  const db = fresh();
  const before = db.snapshot('orders').length;
  const sale = await db.rpc('create_sale', { p_customer_id: 'demo-u-2', p_payment_method: 'cash', p_amount_paid: 50000, p_items: [{ product_id: 'demo-p-ayam', quantity: 2 }, { product_id: 'demo-p-teh', quantity: 1 }], p_note: ' tanpa sayur ' });
  assert.equal(sale.error, null);
  assert.deepEqual([sale.data.total, sale.data.amount_paid, sale.data.change_due, sale.data.notes], [42000, 50000, 8000, 'tanpa sayur']);
  assert.match(sale.data.order_number, /^MF-\d{12}-[0-9a-f]{4}$/);
  assert.equal(db.snapshot('orders').length, before + 1);
  const items = (await db.from('order_items').select('*').eq('order_id', sale.data.id).eq('owner_id', UID)).data;
  assert.deepEqual(items.map((i) => [i.product_name, i.quantity, i.line_total]).sort(), [['Es Teh Manis', 1, 6000], ['Mie Ayam Spesial', 2, 36000]]);
  assert.equal((await db.from('products').select('stock').eq('id', 'demo-p-ayam').single()).data.stock, 40, 'the cart reserved stock already');
});

test('create_sale validates payment, customer, items and cash like the real function', async () => {
  const db = fresh();
  const one = [{ product_id: 'demo-p-ayam', quantity: 1 }];
  assert.match((await db.rpc('create_sale', { p_payment_method: 'cash', p_amount_paid: 1000, p_items: one })).error.message, /Uang tunai kurang/);
  assert.match((await db.rpc('create_sale', { p_payment_method: 'qris', p_amount_paid: 1, p_items: one })).error.message, /Metode pembayaran tidak valid/);
  assert.match((await db.rpc('create_sale', { p_payment_method: 'atm', p_amount_paid: 0, p_items: [] })).error.message, /Keranjang kosong/);
  assert.match((await db.rpc('create_sale', { p_customer_id: 'ghost', p_payment_method: 'atm', p_amount_paid: 0, p_items: one })).error.message, /Pelanggan bukan milik akun ini/);
  assert.match((await db.rpc('create_sale', { p_payment_method: 'atm', p_amount_paid: 0, p_items: [{ product_id: 'ghost', quantity: 1 }] })).error.message, /Produk tidak ditemukan/);
  assert.match((await db.rpc('create_sale', { p_payment_method: 'atm', p_amount_paid: 0, p_items: [{ product_id: 'demo-p-ayam', quantity: 0 }] })).error.message, /Jumlah produk tidak valid/);
  const wallet = await db.rpc('create_sale', { p_payment_method: 'ewallet', p_amount_paid: 1, p_items: one });
  assert.deepEqual([wallet.data.amount_paid, wallet.data.change_due], [18000, 0], 'non-cash pays exactly the total');
  assert.match((await db.rpc('nonexistent', {})).error.message, /Could not find the function/);
});

test('realtime: subscribed channels receive matching changes, with the payload shape the dashboard reads', async () => {
  const db = fresh();
  const seen = [];
  const other = [];
  const status = [];
  const channel = db.channel('live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `owner_id=eq.${UID}` }, (p) => seen.push(['orders', p.eventType, p.new.id]))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items', filter: `owner_id=eq.${UID}` }, (p) => seen.push(['items', p.eventType]))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'owner_id=eq.someone-else' }, (p) => other.push(p))
    .subscribe((s) => status.push(s));
  assert.ok(isMockChannel(channel));
  await db.rpc('create_sale', { p_payment_method: 'ewallet', p_amount_paid: 0, p_items: [{ product_id: 'demo-p-ayam', quantity: 1 }, { product_id: 'demo-p-teh', quantity: 1 }] });
  await tick();
  assert.deepEqual(status, ['SUBSCRIBED']);
  assert.equal(seen.filter((e) => e[0] === 'orders').length, 1);
  assert.equal(seen.filter((e) => e[0] === 'items').length, 2);
  assert.equal(other.length, 0, 'other filters get nothing');
  await db.removeChannel(channel);
  await db.rpc('create_sale', { p_payment_method: 'ewallet', p_amount_paid: 0, p_items: [{ product_id: 'demo-p-ayam', quantity: 1 }] });
  await tick();
  assert.equal(seen.filter((e) => e[0] === 'orders').length, 1, 'nothing after removeChannel');
});

test('realtime reports deletes with the old row', async () => {
  const db = fresh();
  const events = [];
  db.channel('c').on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `owner_id=eq.${UID}` }, (p) => events.push([p.eventType, p.old.id, p.new.id])).subscribe();
  await db.from('products').delete().eq('id', 'demo-p-tahu').eq('owner_id', UID);
  await tick();
  assert.deepEqual(events, [['DELETE', 'demo-p-tahu', undefined]]);
});

test('the fake session lets the app believe it is signed in, and sign-out ends the demo', async () => {
  let signedOut = 0;
  const db = fresh({ onSignOut: () => { signedOut += 1; } });
  const { data } = await db.auth.getSession();
  assert.equal(data.session.user.id, UID);
  assert.ok(data.session.expires_at * 1000 > NOW + 3600000, 'never needs a refresh');
  assert.equal((await db.auth.refreshSession()).data.session.user.id, UID);
  await db.auth.signOut();
  assert.equal(signedOut, 1);
  assert.match((await db.auth.signInWithPassword()).error.message, /mode demo/);
});

test('the photo bucket keeps uploads only in memory', async () => {
  const db = fresh();
  const up = await db.storage.from('product-images').upload('u/products/a.webp', new Blob(['x'], { type: 'image/webp' }));
  assert.equal(up.error, null);
  assert.ok(db.storage.from('product-images').getPublicUrl('u/products/a.webp').data.publicUrl.startsWith('blob:'));
  assert.equal(db.storage.from('product-images').getPublicUrl('missing').data.publicUrl, '');
});

test('after dispose every query fails instead of touching anything', async () => {
  const db = fresh();
  db.dispose();
  assert.equal((await db.from('products').select('*')).error.code, 'DEMO_ENDED');
});

test('demo mode: starts with a 5-minute clock, discards everything on restart and on stop', async () => {
  assert.equal(DEMO_DURATION_MS, 5 * 60 * 1000);
  assert.equal(isDemoActive(), false);
  assert.equal(getDemoClient(), null);
  let changes = 0;
  const off = subscribeDemo(() => { changes += 1; });
  const first = startDemo(NOW);
  assert.equal(first.endsAt, NOW + DEMO_DURATION_MS);
  assert.equal(isDemoActive(), true);
  const c1 = getDemoClient();
  await c1.rpc('create_sale', { p_payment_method: 'ewallet', p_amount_paid: 0, p_items: [{ product_id: 'demo-p-ayam', quantity: 1 }] });
  const orders1 = c1.snapshot('orders').length;
  await c1.from('categories').insert({ name: 'Sementara', owner_id: DEMO_USER_ID });
  const second = startDemo(NOW);
  assert.equal(second.run, first.run + 1, 'a restart is a new run (the dashboard remounts on it)');
  const c2 = getDemoClient();
  assert.notEqual(c1, c2);
  assert.equal(c2.snapshot('orders').length, orders1 - 1, 'the sale of the first run is gone');
  assert.ok(!c2.snapshot('categories').some((c) => c.name === 'Sementara'));
  assert.equal((await c1.from('orders').select('*')).error.code, 'DEMO_ENDED', 'the old run is dead');
  stopDemo();
  assert.equal(isDemoActive(), false);
  assert.equal(getDemoClient(), null);
  stopDemo();
  off();
  assert.equal(changes, 3, 'start, restart and stop notify; a second stop does not');
});

test('signing out inside the demo ends it', () => {
  startDemo(NOW);
  getDemoClient().auth.signOut();
  return tick().then(() => assert.equal(isDemoActive(), false));
});

test('countdown helpers', () => {
  assert.equal(remainingMs(NOW + 5000, NOW), 5000);
  assert.equal(remainingMs(NOW - 5000, NOW), 0);
  assert.equal(formatClock(5 * 60 * 1000), '5:00');
  assert.equal(formatClock(61_000), '1:01');
  assert.equal(formatClock(59_001), '1:00', 'rounds up');
  assert.equal(formatClock(1), '0:01');
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(-50), '0:00');
});

test('a whole working session in the demo never touches the network or the browser storage', async () => {
  const saved = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, indexedDB: globalThis.indexedDB };
  const boom = () => { throw new Error('the demo must not do this'); };
  globalThis.fetch = boom;
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) Object.defineProperty(globalThis, name, { configurable: true, get: boom });
  try {
    const client = startDemo(NOW) && getDemoClient();
    const catalog = await client.from('products').select('*').eq('owner_id', DEMO_USER_ID).order('created_at', { ascending: false });
    assert.equal(catalog.error, null);
    await client.from('categories').insert({ name: 'Dessert', color: '#ec4899', owner_id: DEMO_USER_ID }).select().single();
    await client.from('customers').insert({ name: 'Tamu Demo', owner_id: DEMO_USER_ID }).select().single();
    await client.from('products').update({ stock: 3 }).eq('id', 'demo-p-ayam').eq('owner_id', DEMO_USER_ID).select('stock');
    await client.rpc('adjust_product_stock', { p_product_id: 'demo-p-ayam', p_quantity_delta: -1 });
    await client.rpc('create_sale', { p_payment_method: 'ewallet', p_amount_paid: 0, p_items: [{ product_id: 'demo-p-ayam', quantity: 1 }] });
    await client.from('notifications').insert({ owner_id: DEMO_USER_ID, type: 'info', title: 't', detail: '', page: 'Overview' }).select('*').single();
    await client.storage.from('product-images').upload('x.webp', new Blob(['x']));
    await client.from('orders').delete().eq('id', 'demo-o-1').eq('owner_id', DEMO_USER_ID);
    stopDemo();
  } finally {
    globalThis.fetch = saved.fetch;
    for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: saved[name] });
    stopDemo();
  }
});
