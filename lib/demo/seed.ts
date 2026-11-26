/**
 * Demo mode: the sample shop ("Mie Kelar Demo") every demo starts from. Built fresh for each demo run, relative to `now`, so the history always
 * ends today. Deterministic for a given `now`: the random generator is seeded, so two runs show the same shop.
 */
import { demoPhoto, type DemoPhotoKind } from './photos';

export type Row = Record<string, any>;
export type DemoSeed = { categories: Row[]; products: Row[]; customers: Row[]; orders: Row[]; order_items: Row[]; stock_movements: Row[]; notifications: Row[] };

/** Small deterministic random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES: [string, string, string][] = [
  ['mie', 'Mie', '#f97316'],
  ['minuman', 'Minuman', '#3b82f6'],
  ['camilan', 'Camilan', '#eab308'],
  ['topping', 'Topping', '#10b981'],
  ['paket', 'Paket Hemat', '#a855f7'],
];

// [key, name, description, category, price, cost, stock, photo]
const PRODUCTS: [string, string, string, string, number, number, number, DemoPhotoKind | null][] = [
  ['ayam', 'Mie Ayam Spesial', 'Mie kenyal dengan ayam kecap, telur, dan daun bawang.', 'mie', 18000, 9000, 40, 'noodle'],
  ['bakso', 'Mie Ayam Bakso', 'Mie ayam dengan tiga bakso sapi dan kuah gurih.', 'mie', 22000, 11000, 35, 'noodle-bakso'],
  ['seafood', 'Mie Goreng Seafood', 'Mie goreng wajan dengan udang dan cumi.', 'mie', 24000, 13000, 28, 'noodle-seafood'],
  ['pedas', 'Mie Pedas Level 5', 'Mie dengan sambal cabai rawit, untuk pencinta pedas.', 'mie', 20000, 9500, 22, 'noodle-red'],
  ['jamur', 'Mie Kuah Jamur', 'Kuah kaldu jamur yang ringan dan wangi.', 'mie', 19000, 9000, 30, 'noodle-mushroom'],
  ['ceker', 'Mie Ayam Ceker', 'Mie ayam dengan ceker empuk.', 'mie', 23000, 12000, 4, 'noodle-ceker'],
  ['teh', 'Es Teh Manis', 'Teh seduh dingin dengan gula pasir.', 'minuman', 6000, 1500, 80, 'tea'],
  ['jeruk', 'Es Jeruk', 'Jeruk peras segar dengan es batu.', 'minuman', 8000, 2500, 60, 'orange'],
  ['kopi', 'Kopi Susu Gula Aren', 'Espresso, susu segar, dan gula aren.', 'minuman', 15000, 6000, 45, 'coffee'],
  ['tarik', 'Teh Tarik', 'Teh susu hangat yang ditarik hingga berbusa.', 'minuman', 12000, 4000, 0, null],
  ['pangsit', 'Pangsit Goreng', 'Isi ayam cincang, digoreng renyah (5 pcs).', 'camilan', 12000, 5000, 50, 'dumpling'],
  ['kentang', 'Kentang Goreng', 'Kentang goreng renyah dengan bumbu gurih.', 'camilan', 15000, 6000, 38, 'fries'],
  ['tahu', 'Tahu Crispy', 'Tahu goreng tepung dengan sambal.', 'camilan', 10000, 4000, 5, 'tofu'],
  ['telur', 'Telur Rebus', 'Tambahan telur rebus.', 'topping', 3000, 1200, 100, null],
  ['baksotop', 'Bakso Tambahan', 'Tambahan tiga bakso sapi.', 'topping', 5000, 2500, 60, null],
  ['ayamtop', 'Extra Ayam Cincang', 'Tambahan ayam kecap.', 'topping', 7000, 3500, 70, null],
  ['hemat1', 'Paket Hemat 1', 'Mie Ayam Spesial + Es Teh Manis.', 'paket', 22000, 10500, 25, 'combo'],
  ['keluarga', 'Paket Keluarga', '3 mie ayam + 3 es teh manis.', 'paket', 75000, 38000, 10, 'combo'],
];

const CUSTOMERS: [string, string, string, string][] = [
  ['Budi Santoso', '0812-3456-7801', 'budi.santoso@example.com', 'Langganan makan siang, suka pedas.'],
  ['Siti Rahmawati', '0813-2222-4410', 'siti.r@example.com', 'Biasa pesan paket hemat.'],
  ['Andi Pratama', '0857-1100-9921', 'andi.p@example.com', ''],
  ['Dewi Lestari', '0821-7788-3402', 'dewi.l@example.com', 'Alergi udang.'],
  ['Rizky Ramadhan', '0878-4455-1203', 'rizky.r@example.com', ''],
  ['Maya Putri', '0896-3321-7755', 'maya.putri@example.com', 'Pesan untuk kantor tiap Jumat.'],
  ['Hendra Wijaya', '0819-6600-2288', 'hendra.w@example.com', ''],
  ['Lina Marlina', '0838-9012-4466', 'lina.m@example.com', 'Tanpa sayur.'],
];

const NOTES = ['Tanpa sayur', 'Pedas banget', 'Kuah dipisah', 'Bungkus', 'Tambah sambal', ''];
const CATEGORY_WEIGHT: Record<string, number> = { mie: 5, minuman: 4, camilan: 2, topping: 1, paket: 2 };

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function orderNumber(at: Date, suffix: string): string {
  return `MF-${pad(at.getUTCFullYear() % 100)}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}-${suffix}`;
}

export function buildDemoSeed(now: number, uid: string): DemoSeed {
  const rand = seededRandom(20261116);
  const at = (ms: number) => new Date(ms).toISOString();
  const categories: Row[] = CATEGORIES.map(([key, name, color], i) => ({ id: `demo-c-${key}`, name, color, created_at: at(now - (40 - i) * 86400000), owner_id: uid }));
  const catOf = new Map(categories.map((c) => [c.id, c]));

  const products: Row[] = PRODUCTS.map(([key, name, description, cat, price, cost, stock, photo], i) => ({
    id: `demo-p-${key}`, name, description, price, cost, stock, image_url: photo ? demoPhoto(photo) : null,
    category_id: `demo-c-${cat}`, is_active: true, created_at: at(now - (30 - i) * 86400000), updated_at: at(now - (30 - i) * 86400000), owner_id: uid,
  }));

  const customers: Row[] = CUSTOMERS.map(([name, phone, email, notes], i) => ({ id: `demo-u-${i + 1}`, name, phone, email, notes, created_at: at(now - (25 - i * 2) * 86400000), owner_id: uid }));

  // order history: 14 days back, busier on weekends, ending a few minutes ago today
  const sellable = products.filter((p) => p.stock > 0);
  const weights = sellable.map((p) => CATEGORY_WEIGHT[String(catOf.get(p.category_id)?.id).replace('demo-c-', '')] || 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pick = () => { let r = rand() * totalWeight; for (let i = 0; i < sellable.length; i += 1) { r -= weights[i]; if (r <= 0) return sellable[i]; } return sellable[0]; };

  const stamps: number[] = [];
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  for (let d = 0; d < 14; d += 1) {
    const day = new Date(startOfToday.getTime() - d * 86400000);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const count = d === 0 ? 6 : (weekend ? 5 : 3) + Math.floor(rand() * 3);
    for (let k = 0; k < count; k += 1) {
      const t = d === 0 ? now - (k + 1) * (22 + Math.floor(rand() * 20)) * 60000 : day.getTime() + (10 * 60 + Math.floor(rand() * 11 * 60)) * 60000;
      stamps.push(t);
    }
  }
  stamps.sort((a, b) => a - b);

  const orders: Row[] = [];
  const order_items: Row[] = [];
  stamps.forEach((t, i) => {
    const chosen = new Map<string, number>();
    const lines = 1 + Math.floor(rand() * 3);
    for (let l = 0; l < lines; l += 1) { const p = pick(); chosen.set(p.id, (chosen.get(p.id) || 0) + 1 + Math.floor(rand() * 2)); }
    let subtotal = 0;
    const id = `demo-o-${i + 1}`;
    chosen.forEach((qty, pid) => {
      const p = products.find((x) => x.id === pid)!;
      subtotal += p.price * qty;
      order_items.push({ id: `demo-i-${i + 1}-${pid.replace('demo-p-', '')}`, order_id: id, product_id: pid, product_name: p.name, quantity: qty, unit_price: p.price, line_total: p.price * qty, owner_id: uid });
    });
    const r = rand();
    const payment_method = r < 0.5 ? 'cash' : r < 0.8 ? 'ewallet' : 'atm';
    const amount_paid = payment_method === 'cash' ? Math.ceil(subtotal / 5000) * 5000 + (rand() < 0.25 ? 20000 : 0) : subtotal;
    const cancelled = i === 9 || i === 31;
    orders.push({
      id, order_number: orderNumber(new Date(t), Math.floor(rand() * 65535).toString(16).padStart(4, '0')),
      customer_id: rand() < 0.4 ? `demo-u-${1 + Math.floor(rand() * CUSTOMERS.length)}` : null,
      status: cancelled ? 'cancelled' : 'completed', payment_method, subtotal, discount: 0, total: subtotal, amount_paid, change_due: Math.max(0, amount_paid - subtotal),
      notes: NOTES[Math.floor(rand() * NOTES.length)] || null, created_at: at(t), cashier_id: uid, owner_id: uid,
    });
  });

  const notifications: Row[] = [
    { id: 'demo-n-1', owner_id: uid, type: 'info', title: 'Selamat datang di demo Mieflow', detail: 'Semua data di sini hanya contoh dan tidak akan disimpan.', page: 'Overview', target_id: null, is_read: false, created_at: at(now - 60000) },
    { id: 'demo-n-2', owner_id: uid, type: 'success', title: 'Rekap kemarin siap', detail: 'Buka Analisa untuk melihat penjualan 14 hari terakhir.', page: 'Analytics', target_id: null, is_read: false, created_at: at(now - 3600000) },
  ];

  return { categories, products, customers, orders, order_items, stock_movements: [], notifications };
}
