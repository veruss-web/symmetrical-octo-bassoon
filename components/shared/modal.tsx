'use client';

/** Create/edit dialog dispatcher (categories -> category-modal.tsx, customers below), plus the delete confirmation dialog.
 *  Products have their own full-page form: components/screens/product-form.tsx. */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Mail, Trash2, UserRound, Users, X } from 'lucide-react';
import { CustomerMenuField } from '@/components/shared/customer-menu-field';
import { CategoryModal } from '@/components/shared/category-modal';
import type { Category, Customer, Product } from '@/lib/types';

export type ModalType = 'category' | 'customer';

export function DeleteConfirmDialog({data,onCancel,onConfirm}:{data:any;onCancel:()=>void;onConfirm:()=>void}){return <motion.div className="delete-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)onCancel()}}><motion.div className="delete-dialog" initial={{opacity:0,y:18,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} transition={{duration:.18}} role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="delete-icon"><Trash2 size={22}/></div><div className="delete-copy"><span className="delete-eyebrow">KONFIRMASI PENGHAPUSAN</span><h2 id="delete-title">Hapus {data.label}?</h2><p><b>{data.name}</b> akan dihapus secara permanen dari data Mieflow.</p></div><div className="delete-actions"><button type="button" className="delete-cancel" onClick={onCancel}>Batal</button><button type="button" className="delete-confirm" onClick={onConfirm}><Trash2 size={16}/> Hapus permanen</button></div></motion.div></motion.div>}

const CUSTOMER_DEFAULTS={name:'',phone:'',email:'',notes:''};

type ModalProps={type:ModalType;initial:Category|Customer|null;categories:Category[];products:Product[];onClose:()=>void;onSave:(type:ModalType,form:any)=>void|Promise<void>};

export function Modal(props:ModalProps){
 return props.type==='category'
  ?<CategoryModal initial={props.initial as Category|null} categories={props.categories} onClose={props.onClose} onSave={props.onSave}/>
  :<CustomerModal {...props}/>;
}

function CustomerModal({initial,categories,products,onClose,onSave}:ModalProps){
 const [form,setForm]=useState<any>({...CUSTOMER_DEFAULTS,...(initial||{})});
 const set=(k:string,v:any)=>setForm((f:any)=>({...f,[k]:v}));
 return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={onClose}>
  <motion.form className="modal cx-modal" initial={{y:20,scale:.97}} animate={{y:0,scale:1}} onMouseDown={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();onSave('customer',form)}}>
   <div className="modal-head modern-head"><div><span>{initial?'EDIT DATA':'DATA BARU'}</span><h2>{initial?'Ubah':'Tambah'} pelanggan</h2></div><button type="button" aria-label="Tutup" onClick={onClose}><X size={18}/></button></div>
   <div className="cx-form">
    <div className="cx-form-intro"><div className="cx-form-icon"><Users size={20}/></div><div><b>Profil pelanggan</b><span>Simpan data pelanggan dan pilih menu pesanannya agar transaksi dan progres lebih mudah dikelola.</span></div></div>
    <div className="cx-form-section"><div className="cx-section-title"><i>1</i><div><b>Data pelanggan</b><small>Informasi kontak dasar</small></div></div>
    <div className="cx-form-grid">
      <label className="cx-field full"><span className="cx-field-label">Nama pelanggan <em>Wajib</em></span><div className="cx-input"><UserRound size={17}/><input required value={form.name??''} placeholder="Contoh: Budi Santoso" onChange={e=>set('name',e.target.value)}/></div></label>
      <label className="cx-field"><span className="cx-field-label">Nomor telepon</span><div className="cx-input"><span className="cx-prefix">+62</span><input inputMode="tel" value={(form.phone??'').replace(/^\+62\s?/,'')} placeholder="812 3456 7890" onChange={e=>set('phone',e.target.value)}/></div></label>
      <label className="cx-field"><span className="cx-field-label">Email</span><div className="cx-input"><Mail size={17}/><input type="email" value={form.email??''} placeholder="nama@email.com" onChange={e=>set('email',e.target.value)}/></div></label>
    </div></div>
    <div className="cx-form-section"><div className="cx-section-title"><i>2</i><div><b>Pesanan pelanggan</b><small>Pilih menu berdasarkan kategori</small></div></div>
     <CustomerMenuField products={products} categories={categories} value={form.notes??''} onChange={(notes:string)=>set('notes',notes)}/>
    </div>
   </div>
   <div className="modal-foot"><button type="button" className="secondary" onClick={onClose}>Batal</button><button className="primary">{initial?'Simpan perubahan':'Simpan pelanggan'} <Check size={17}/></button></div>
  </motion.form>
 </motion.div>
}
