"use client";

import Link from 'next/link';
import { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { StoreText, useStorefrontLanguage } from './storefront-language';
import { toggleMobileCategory, type MobileCategoryNode } from '@/lib/mobile-category-menu';
import styles from './mobile-category-menu.module.css';

type BranchProps = {nodes:MobileCategoryNode[];open:ReadonlySet<string>;toggle:(node:MobileCategoryNode)=>void;onNavigate:()=>void};
function Branch({nodes,open,toggle,onNavigate}: BranchProps) {
  const id = useId();
  const {t} = useStorefrontLanguage();
  return <ul className={styles.list}>{nodes.map(node=>{
    const expandable = node.children.length > 0;
    const expanded = open.has(node.id);
    const panelId = `${id}-${node.id}`;
    return <li key={node.id}>
      <div className={styles.row}>
        <Link href={node.href} onClick={onNavigate}><StoreText>{node.name}</StoreText></Link>
        {expandable && <button type="button" aria-label={`${t(expanded ? 'Réduire' : 'Développer')} ${t(node.name)}`} aria-expanded={expanded} aria-controls={panelId} onClick={()=>toggle(node)}>
          {expanded ? <Minus size={17} aria-hidden="true"/> : <Plus size={17} aria-hidden="true"/>}
        </button>}
      </div>
      {expandable && <div id={panelId} className={`${styles.panel} ${expanded ? styles.expanded : ''}`} aria-hidden={!expanded} inert={!expanded}>
        <div><Branch nodes={node.children} open={open} toggle={toggle} onNavigate={onNavigate}/></div>
      </div>}
    </li>;
  })}</ul>;
}

export function MobileCategoryMenu({onNavigate,nodes}: {onNavigate:()=>void;nodes:MobileCategoryNode[]}) {
  const {t} = useStorefrontLanguage();
  const [open,setOpen] = useState<Set<string>>(()=>new Set());
  return <nav className={`mobile-category-list ${styles.root}`} aria-label={t("Catégories de produits")}>
    {nodes.length ? <Branch nodes={nodes} open={open} toggle={node=>setOpen(current=>toggleMobileCategory(current,node))} onNavigate={onNavigate}/>
      : <p className={styles.feedback}><StoreText>Aucune catégorie disponible.</StoreText></p>}
  </nav>;
}
