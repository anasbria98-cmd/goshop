"use client";

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { permanentlyDeleteProduct } from './delete-product-action';
import styles from './delete-product.module.css';

type Product={id:string;name:string;sku:string};
function Confirmation({product,onClose}:{product:Product;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const cancel=useRef<HTMLButtonElement>(null);
  const id=useId();
  const router=useRouter();
  const [confirmed,setConfirmed]=useState(false);
  const [state,action,pending]=useActionState(permanentlyDeleteProduct,{error:null,deleted:false});
  useEffect(()=>{const element=dialog.current;element?.showModal();cancel.current?.focus();return ()=>element?.close();},[]);
  useEffect(()=>{if(state.deleted){onClose();router.refresh();}},[state.deleted,onClose,router]);
  return createPortal(<dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-warning`} onCancel={event=>{event.preventDefault();if(!pending)onClose();}}>
    <h2 id={`${id}-title`}>Supprimer ce produit ?</h2>
    <p><strong>{product.name}</strong></p><p>SKU : <code>{product.sku}</code></p>
    <p id={`${id}-warning`}>Attention : la suppression est définitive et irréversible. Les données appartenant uniquement à ce produit seront supprimées. Les produits liés à des commandes ou à un historique protégé ne peuvent pas être supprimés.</p>
    <form action={action} onReset={()=>setConfirmed(false)}>
      <input type="hidden" name="id" value={product.id}/><input type="hidden" name="name" value={product.name}/><input type="hidden" name="sku" value={product.sku}/>
      <label className={styles.confirm}><input name="confirmed" type="checkbox" required checked={confirmed} disabled={pending} onChange={event=>setConfirmed(event.target.checked)}/> Je confirme la suppression définitive de ce produit.</label>
      {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
      <div className={styles.actions}><button ref={cancel} type="button" className="admin-secondary" disabled={pending} onClick={onClose}>Annuler</button><button type="submit" className={styles.danger} disabled={!confirmed||pending}>{pending?'Suppression…':'Supprimer définitivement'}</button></div>
      <span role="status" className={styles.status}>{pending?'Suppression en cours…':''}</span>
    </form>
  </dialog>,document.body);
}

export function DeleteProduct({product}:{product:Product}) {
  const [open,setOpen]=useState(false);
  const trigger=useRef<HTMLButtonElement>(null);
  const close=()=>{setOpen(false);trigger.current?.closest('details')?.querySelector('summary')?.focus();};
  return <><button ref={trigger} type="button" className={styles.trigger} onClick={()=>{trigger.current?.closest('details')?.removeAttribute('open');setOpen(true);}}><Trash2 size={14} aria-hidden="true"/> Supprimer</button>{open && <Confirmation product={product} onClose={close}/>}</>;
}
