/**
 * Demo mode: an in-memory stand-in for the part of the Supabase client the app uses. Nothing here talks to a network or a browser store:
 * every table lives in a JS object that disappears with the page, which is what makes "the data is not saved" true by construction.
 *
 * It mirrors what the real database does for this app: filters / order / limit / single, insert / update / delete with RETURNING,
 * the `on delete set null / cascade` rules, the unique category name, the price / stock checks, the two RPCs (`adjust_product_stock`,
 * `create_sale`, same rules and messages as supabase/schema.sql), realtime `postgres_changes` events and a fake product-image bucket.
 */
import type { DemoSeed, Row } from './seed';
import { orderNumber } from './seed';

export type MockOptions = { userId: string; email: string; onSignOut?: () => void; clock?: () => number };
type DbError = { message: string; code: string; details: null; hint: null };
type Result = { data: any; error: DbError | null; count: null; status: number; statusText: string };
type Listener = (payload: any) => void;

const TABLES = ['categories', 'products', 'customers', 'orders', 'order_items', 'stock_movements', 'notifications'] as const;
type Table = (typeof TABLES)[number];

const err = (message: string, code: string): DbError => ({ message, code, details: null, hint: null });
class DbFailure extends Error { constructor(readonly dbError: DbError) { super(dbError.message); } }
const fail = (message: string, code = 'P0001'): never => { throw new DbFailure(err(message, code)); };

const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `demo-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`);

/** `owner_id=eq.abc` (the filter string of a realtime subscription) as a row test. */
function parseRealtimeFilter(filter?: string): (row: Row) => boolean {
  const m = /^([\w]+)=eq\.(.*)$/.exec(filter || '');
  return m ? (row) => String(row?.[m[1]]) === m[2] : () => true;
}

export function isMockChannel(value: any): boolean {
  return Boolean(value && value.__demoChannel === true);
}

export function createMockSupabase(seed: DemoSeed, options: MockOptions) {
  const clock = options.clock || Date.now;
  const nowIso = () => new Date(clock()).toISOString();
  const uid = options.userId;
  let disposed = false;

  const data: Record<Table, Row[]> = {
    categories: clone(seed.categories), products: clone(seed.products), customers: clone(seed.customers), orders: clone(seed.orders),
    order_items: clone(seed.order_items), stock_movements: clone(seed.stock_movements), notifications: clone(seed.notifications),
  };

  // ------------------------------------------------------------------ realtime
  const channels = new Set<MockChannel>();
  const emit = (table: Table, eventType: 'INSERT' | 'UPDATE' | 'DELETE', next: Row | null, old: Row | null) => {
    channels.forEach((channel) => channel.deliver(table, eventType, next, old));
  };

  class MockChannel {
    readonly __demoChannel = true;
    private handlers: { event: string; table: string; test: (row: Row) => boolean; cb: Listener }[] = [];
    constructor(readonly name: string) {}
    on(type: string, filter: { event?: string; table?: string; filter?: string }, cb: Listener) {
      if (type === 'postgres_changes') this.handlers.push({ event: filter.event || '*', table: filter.table || '', test: parseRealtimeFilter(filter.filter), cb });
      return this;
    }
    subscribe(cb?: (status: string) => void) {
      if (!disposed) channels.add(this);
      if (cb) setTimeout(() => cb('SUBSCRIBED'), 0);
      return this;
    }
    unsubscribe() { channels.delete(this); return Promise.resolve('ok'); }
    deliver(table: Table, eventType: string, next: Row | null, old: Row | null) {
      this.handlers.forEach((h) => {
        if (h.table !== table || (h.event !== '*' && h.event !== eventType) || !h.test(next || old || {})) return;
        const payload = { schema: 'public', table, commit_timestamp: nowIso(), eventType, new: clone(next) || {}, old: clone(old) || {}, errors: null };
        setTimeout(() => { if (!disposed) h.cb(payload); }, 0);
      });
    }
  }

  // ------------------------------------------------------------------ table rules (defaults + checks, like the real constraints)
  const rows = (table: Table) => data[table].filter((r) => r.owner_id === uid);

  function prepare(table: Table, input: Row, existing?: Row): Row {
    const row: Row = { ...(existing || {}), ...input };
    if (row.owner_id !== undefined && row.owner_id !== uid) fail('new row violates row-level security policy', '42501');
    row.owner_id = uid;
    if (!existing) { row.id = row.id || uuid(); row.created_at = row.created_at || nowIso(); }
    const name = typeof row.name === 'string' ? row.name.trim() : row.name;
    if (table === 'categories') {
      if (!name) fail('null value in column "name" violates not-null constraint', '23502');
      row.name = name; row.color = row.color || '#111827';
      if (data.categories.some((c) => c.name === name && c.id !== row.id)) fail('duplicate key value violates unique constraint "categories_name_key"', '23505');
    }
    if (table === 'products') {
      if (!name) fail('null value in column "name" violates not-null constraint', '23502');
      row.name = name; row.description = row.description ?? null; row.cost = Number(row.cost ?? 0); row.price = Number(row.price ?? 0); row.stock = Number(row.stock ?? 0);
      row.image_url = row.image_url ?? null; row.category_id = row.category_id ?? null; row.is_active = row.is_active ?? true; row.updated_at = nowIso();
      if (!(row.price >= 0)) fail('new row for relation "products" violates check constraint "products_price_check"', '23514');
      if (!Number.isInteger(row.stock) || row.stock < 0) fail('new row for relation "products" violates check constraint "products_stock_check"', '23514');
    }
    if (table === 'customers') {
      if (!name) fail('null value in column "name" violates not-null constraint', '23502');
      row.name = name; row.phone = row.phone ?? null; row.email = row.email ?? null; row.notes = row.notes ?? null;
    }
    if (table === 'notifications') { row.is_read = row.is_read ?? false; row.detail = row.detail ?? ''; }
    return row;
  }

  function cascadeDelete(table: Table, gone: Row) {
    if (table === 'categories') data.products.filter((p) => p.category_id === gone.id).forEach((p) => { const old = clone(p); p.category_id = null; emit('products', 'UPDATE', p, old); });
    if (table === 'customers') data.orders.filter((o) => o.customer_id === gone.id).forEach((o) => { const old = clone(o); o.customer_id = null; emit('orders', 'UPDATE', o, old); });
    if (table === 'products') {
      data.order_items.filter((i) => i.product_id === gone.id).forEach((i) => { i.product_id = null; });
      data.stock_movements = data.stock_movements.filter((m) => m.product_id !== gone.id);
    }
    if (table === 'orders') {
      const items = data.order_items.filter((i) => i.order_id === gone.id);
      data.order_items = data.order_items.filter((i) => i.order_id !== gone.id);
      items.forEach((i) => emit('order_items', 'DELETE', null, i));
      data.stock_movements.forEach((m) => { if (m.order_id === gone.id) m.order_id = null; });
    }
  }

  // ------------------------------------------------------------------ query builder
  type Op = 'select' | 'insert' | 'update' | 'delete';
  class Query implements PromiseLike<Result> {
    private op: Op = 'select';
    private columns = '*';
    private tests: ((r: Row) => boolean)[] = [];
    private sorts: { col: string; asc: boolean }[] = [];
    private max: number | undefined;
    private payload: any;
    private returning = false;
    private mode: 'many' | 'single' | 'maybe' = 'many';
    constructor(private table: Table) {}
    select(columns = '*') { if (this.op === 'select') this.columns = columns; else { this.returning = true; this.columns = columns; } return this; }
    insert(payload: any) { this.op = 'insert'; this.payload = payload; return this; }
    update(payload: any) { this.op = 'update'; this.payload = payload; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(col: string, value: any) { this.tests.push((r) => r[col] === value); return this; }
    neq(col: string, value: any) { this.tests.push((r) => r[col] !== value); return this; }
    in(col: string, values: any[]) { this.tests.push((r) => values.includes(r[col])); return this; }
    gte(col: string, value: any) { this.tests.push((r) => r[col] >= value); return this; }
    lte(col: string, value: any) { this.tests.push((r) => r[col] <= value); return this; }
    gt(col: string, value: any) { this.tests.push((r) => r[col] > value); return this; }
    lt(col: string, value: any) { this.tests.push((r) => r[col] < value); return this; }
    is(col: string, value: any) { this.tests.push((r) => (value === null ? r[col] == null : r[col] === value)); return this; }
    ilike(col: string, pattern: string) { const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`, 'i'); this.tests.push((r) => re.test(String(r[col] ?? ''))); return this; }
    order(col: string, opts?: { ascending?: boolean }) { this.sorts.push({ col, asc: opts?.ascending !== false }); return this; }
    limit(n: number) { this.max = n; return this; }
    single() { this.mode = 'single'; return this; }
    maybeSingle() { this.mode = 'maybe'; return this; }
    then<A = Result, B = never>(onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null, onrejected?: ((reason: any) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
      return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
    }

    private project(list: Row[]): Row[] {
      const simple = this.columns !== '*' && !/[()!:]/.test(this.columns);
      const cols = simple ? this.columns.split(',').map((c) => c.trim()).filter(Boolean) : null;
      return list.map((r) => { const out = clone(r); if (!cols) return out; const picked: Row = {}; cols.forEach((c) => { picked[c] = out[c]; }); return picked; });
    }
    private matched(): Row[] { return rows(this.table).filter((r) => this.tests.every((t) => t(r))); }
    private finish(list: Row[]): Result {
      const base = { count: null, status: 200, statusText: 'OK' as const };
      if (this.mode === 'many') return { data: list, error: null, ...base };
      if (this.mode === 'maybe') return list.length > 1 ? { data: null, error: err('JSON object requested, multiple (or no) rows returned', 'PGRST116'), ...base } : { data: list[0] ?? null, error: null, ...base };
      return list.length === 1 ? { data: list[0], error: null, ...base } : { data: null, error: err('JSON object requested, multiple (or no) rows returned', 'PGRST116'), ...base };
    }
    run(): Result {
      if (disposed) return { data: null, error: err('Demo sudah berakhir.', 'DEMO_ENDED'), count: null, status: 400, statusText: 'Bad Request' };
      try {
        if (this.op === 'select') {
          let list = this.matched();
          this.sorts.slice().reverse().forEach(({ col, asc }) => { list = list.slice().sort((a, b) => (a[col] === b[col] ? 0 : (a[col] > b[col] ? 1 : -1) * (asc ? 1 : -1))); });
          if (this.max !== undefined) list = list.slice(0, this.max);
          return this.finish(this.project(list));
        }
        if (this.op === 'insert') {
          const input: Row[] = Array.isArray(this.payload) ? this.payload : [this.payload];
          const made = input.map((p) => prepare(this.table, p));
          made.forEach((row) => { data[this.table].push(row); emit(this.table, 'INSERT', row, null); });
          return this.finish(this.returning ? this.project(made) : []);
        }
        if (this.op === 'update') {
          const hit = this.matched();
          const updated = hit.map((row) => { const old = clone(row); const next = prepare(this.table, { ...this.payload, id: row.id }, row); Object.assign(row, next); emit(this.table, 'UPDATE', row, old); return row; });
          return this.finish(this.returning ? this.project(updated) : []);
        }
        const hit = this.matched();
        hit.forEach((row) => { data[this.table] = data[this.table].filter((r) => r !== row); cascadeDelete(this.table, row); emit(this.table, 'DELETE', null, row); });
        return this.finish(this.returning ? this.project(hit) : []);
      } catch (e) {
        if (e instanceof DbFailure) return { data: null, error: e.dbError, count: null, status: 400, statusText: 'Bad Request' };
        throw e;
      }
    }
  }

  // ------------------------------------------------------------------ RPCs (same rules and messages as supabase/schema.sql)
  function adjustProductStock(args: Row) {
    const delta = Number(args.p_quantity_delta);
    if (!Number.isFinite(delta) || delta === 0) fail('Perubahan stok tidak valid');
    const product = rows('products').find((p) => p.id === args.p_product_id && p.is_active);
    if (!product) return fail('Produk tidak ditemukan pada akun ini atau nonaktif');
    const next = product.stock + delta;
    if (next < 0) fail(`Stok ${product.name} tidak mencukupi (tersisa ${product.stock})`);
    const old = clone(product);
    product.stock = next; product.updated_at = nowIso();
    emit('products', 'UPDATE', product, old);
    const movement = { id: uuid(), product_id: product.id, quantity_delta: delta, reason: delta < 0 ? 'cart reservation' : 'cart release', order_id: null, created_at: nowIso(), actor_id: uid, owner_id: uid };
    data.stock_movements.push(movement); emit('stock_movements', 'INSERT', movement, null);
    return { id: product.id, stock: next };
  }

  function createSale(args: Row) {
    const items: { product_id: string; quantity: number }[] = Array.isArray(args.p_items) ? args.p_items : [];
    if (!items.length) fail('Keranjang kosong');
    const method = String(args.p_payment_method);
    if (!['cash', 'ewallet', 'atm'].includes(method)) fail('Metode pembayaran tidak valid');
    if (args.p_customer_id && !rows('customers').some((c) => c.id === args.p_customer_id)) fail('Pelanggan bukan milik akun ini');
    let subtotal = 0;
    const lines = items.map((it) => {
      const qty = Number(it.quantity);
      if (!Number.isInteger(qty) || qty <= 0) fail('Jumlah produk tidak valid');
      const product = rows('products').find((p) => p.id === it.product_id && p.is_active);
      if (!product) return fail('Produk tidak ditemukan pada akun ini atau nonaktif');
      subtotal += product.price * qty;
      return { product, qty };
    });
    let paid = Number(args.p_amount_paid || 0);
    if (method === 'cash' && paid < subtotal) fail('Uang tunai kurang');
    if (method !== 'cash') paid = subtotal;
    const change = Math.max(paid - subtotal, 0);
    const note = String(args.p_note ?? '').trim() || null;
    const created = new Date(clock());
    const number = orderNumber(created, uuid().replace(/-/g, '').slice(0, 4));
    const order = { id: uuid(), order_number: number, customer_id: args.p_customer_id || null, status: 'completed', payment_method: method, subtotal, discount: 0, total: subtotal, amount_paid: paid, change_due: change, notes: note, created_at: created.toISOString(), cashier_id: uid, owner_id: uid };
    data.orders.push(order); emit('orders', 'INSERT', order, null);
    lines.forEach(({ product, qty }) => {
      const item = { id: uuid(), order_id: order.id, product_id: product.id, product_name: product.name, quantity: qty, unit_price: product.price, line_total: product.price * qty, owner_id: uid };
      data.order_items.push(item); emit('order_items', 'INSERT', item, null);
    });
    return { id: order.id, order_number: number, total: subtotal, amount_paid: paid, change_due: change, notes: note };
  }

  const rpcs: Record<string, (args: Row) => any> = { adjust_product_stock: adjustProductStock, create_sale: createSale };

  // ------------------------------------------------------------------ session, storage
  const session = {
    access_token: 'demo-access-token', refresh_token: 'demo-refresh-token', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(clock() / 1000) + 86400,
    user: { id: uid, aud: 'authenticated', role: 'authenticated', email: options.email, app_metadata: {}, user_metadata: {}, created_at: nowIso() },
  };
  const authListeners = new Set<(event: string, s: any) => void>();
  const unavailable = async () => ({ data: null, error: { message: 'Tidak tersedia pada mode demo.', name: 'AuthDemoError', status: 400 } });
  const auth = {
    getSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: session.user }, error: null }),
    refreshSession: async () => ({ data: { session, user: session.user }, error: null }),
    onAuthStateChange: (cb: (event: string, s: any) => void) => {
      authListeners.add(cb);
      setTimeout(() => { if (!disposed && authListeners.has(cb)) cb('INITIAL_SESSION', session); }, 0);
      return { data: { subscription: { unsubscribe: () => { authListeners.delete(cb); } } } };
    },
    signOut: async () => { options.onSignOut?.(); return { error: null }; },
    signInWithPassword: unavailable, updateUser: unavailable, resetPasswordForEmail: unavailable, verifyOtp: unavailable,
  };

  const objectUrls = new Map<string, string>();
  const storage = {
    from: (_bucket: string) => ({
      upload: async (path: string, blob: any) => {
        const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : `demo://${path}`;
        objectUrls.set(path, url);
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: objectUrls.get(path) || '' } }),
    }),
  };

  return {
    from: (table: string) => {
      if (!(TABLES as readonly string[]).includes(table)) return new Query('products').eq('id', '__none__');
      return new Query(table as Table);
    },
    rpc: (name: string, args: Row = {}) => Promise.resolve().then(() => {
      const fn = rpcs[name];
      if (!fn) return { data: null, error: err(`Could not find the function public.${name}`, 'PGRST202') };
      try { return { data: fn(args), error: null }; }
      catch (e) { if (e instanceof DbFailure) return { data: null, error: e.dbError }; throw e; }
    }),
    channel: (name: string) => new MockChannel(name),
    removeChannel: (channel: any) => (channel?.unsubscribe ? channel.unsubscribe() : Promise.resolve('ok')),
    auth, storage,
    /** Test / debug helper: a read-only copy of a table. */
    snapshot: (table: Table) => clone(data[table]),
    dispose() {
      disposed = true; channels.clear(); authListeners.clear();
      objectUrls.forEach((url) => { try { if (url.startsWith('blob:')) URL.revokeObjectURL(url); } catch { /* ignore */ } });
      objectUrls.clear();
    },
  };
}

export type MockSupabase = ReturnType<typeof createMockSupabase>;
