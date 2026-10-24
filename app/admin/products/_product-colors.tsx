"use client";
import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { productColorsSchema, type ProductColor } from '@/lib/product-colors';
import styles from './product-colors.module.css';

export function ProductColors({initial,legacyColors=[]}:{initial?:unknown;legacyColors?:ProductColor[]}) {
  const parsed=productColorsSchema.safeParse(initial);
  const [enabled,setEnabled]=useState(parsed.success ? parsed.data.enabled : legacyColors.length>0);
  const [rows,setRows]=useState(()=>(parsed.success ? parsed.data.colors : legacyColors).map((color,index)=>({...color,key:index})));
  const [nextKey,setNextKey]=useState(rows.length);
  const id=useId();
  const update=(key:number,patch:Partial<ProductColor>)=>setRows(current=>current.map(row=>row.key===key?{...row,...patch}:row));
  return <section className="admin-panel product-step" aria-labelledby={`${id}-title`}>
    <div className="admin-panel-heading"><div><h2 id={`${id}-title`}>Couleurs</h2></div><p>Facultatif : nuances affichées sur les cartes du catalogue, sans modifier les variantes.</p></div>
    <input type="hidden" name="display_colors" value={JSON.stringify({enabled,colors:rows.filter(row=>enabled || (row.name.trim() && /^#[0-9a-fA-F]{6}$/.test(row.hex))).map(({name,hex})=>({name,hex}))})}/>
    <div className="admin-toggle-list"><label><span>Afficher les couleurs pour ce produit</span><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/></label></div>
    {rows.map((row,index)=><div className={styles.row} key={row.key}>
      <label>Nom de la couleur<input aria-label={`Nom de la couleur ${index+1}`} value={row.name} required={enabled} maxLength={100} disabled={!enabled} onChange={e=>update(row.key,{name:e.target.value})}/></label>
      <label>Couleur<input aria-label={`Choisir la couleur ${index+1}`} type="color" value={/^#[0-9a-fA-F]{6}$/.test(row.hex)?row.hex:'#ffffff'} disabled={!enabled} onChange={e=>update(row.key,{hex:e.target.value})}/></label>
      <label>HEX<input aria-label={`HEX de la couleur ${index+1}`} value={row.hex} required={enabled} pattern="#[0-9a-fA-F]{6}" disabled={!enabled} onChange={e=>update(row.key,{hex:e.target.value})}/></label>
      <button type="button" className="admin-danger-link" aria-label={`Supprimer la couleur ${index+1}`} onClick={()=>setRows(current=>current.filter(color=>color.key!==row.key))}><Trash2 size={17} aria-hidden="true"/> Supprimer</button>
    </div>)}
    <button className="admin-secondary" type="button" onClick={()=>{setEnabled(true);setRows(current=>[...current,{key:nextKey,name:'',hex:'#ffffff'}]);setNextKey(key=>key+1);}}><Plus size={16} aria-hidden="true"/> Ajouter une couleur</button>
  </section>;
}
