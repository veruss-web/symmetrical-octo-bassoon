'use client';

/** One menu item of Kasir. Every photo fills the same square frame edge to edge (cover, centred), so all tiles look alike; the live stock chip sits
 *  beside the category name, not on the photo; the footer holds the price and either an add button or,
 *  once the item is in the order, a − / qty / + stepper. `stock` is what is still sellable right now (already corrected for
 *  reservations that are in flight), so the number on the tile always matches what a tap will really do. */
import { memo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { categoryEmoji, normalizeHex } from '@/lib/category-colors';
import { money } from '@/lib/format';
import { LOW_STOCK } from '@/lib/inventory';
import { stockLevel } from '@/lib/pos';
import type { Product } from '@/lib/types';

function MenuTileView({product:p,qty,stock,onAdd,onMinus}:{product:Product;qty:number;stock:number;onAdd:(product:Product)=>void;onMinus:(product:Product)=>void}){
 const level=stockLevel(stock,LOW_STOCK);
 const out=level==='out';
 const tone=normalizeHex(p.categories?.color,'#ff5a2c');
 return <article className={`ks-tile ${qty>0?'in':''} ${out?'out':''}`} data-stock={level} style={{['--cat' as any]:tone}}>
  <button type="button" className="ks-tile-main" disabled={out} onClick={()=>onAdd(p)} aria-label={out?`${p.name} habis`:`Tambah ${p.name}, ${money(Number(p.price))}, stok ${stock}`}>
   <span className="ks-tile-media">
    {p.image_url?<img className="ks-tile-photo" src={p.image_url} alt="" loading="lazy" decoding="async"/>:<span className="ks-tile-emoji" aria-hidden="true">{categoryEmoji(p.categories?.name)}</span>}
   </span>
   <span className="ks-tile-info">
    <small className="ks-tile-cat"><i aria-hidden="true"/>{p.categories?.name||'Menu'}</small>
    <b>{p.name}</b>
    <span className={`ks-stock ${level}`} aria-live="polite"><i aria-hidden="true"/>{out?'Habis':<><span className="ks-stock-word">Stok </span>{stock}</>}</span>
   </span>
  </button>
  <div className="ks-tile-foot">
   <strong className="ks-tile-price">{money(Number(p.price))}</strong>
   {qty>0
    ?<div className="ks-tile-step" role="group" aria-label={`Jumlah ${p.name}`}>
      <button type="button" aria-label={`Kurangi ${p.name}`} onClick={()=>onMinus(p)}><Minus size={15}/></button>
      <b>{qty}</b>
      <button type="button" aria-label={`Tambah ${p.name}`} disabled={out} onClick={()=>onAdd(p)}><Plus size={15}/></button>
     </div>
    :<button type="button" className="ks-tile-add" aria-label={`Tambah ${p.name}`} disabled={out} onClick={()=>onAdd(p)}><Plus size={18}/></button>}
  </div>
 </article>
}

/** Memoized: with stable `onAdd` / `onMinus` a tile re-renders only when its own product, quantity or stock changes. */
export const MenuTile=memo(MenuTileView);
