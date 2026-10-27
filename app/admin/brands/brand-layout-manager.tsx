"use client";

import { useRef, useState } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import { BrandLogo } from "@/components/featured-brand-logo";
import { featuredBrandSlots } from "@/lib/featured-brands";
import { moveBrandSlot, placeBrandInSlot, type BrandSlot } from "@/lib/brand-layout";
import type { BrandRow } from "@/lib/database.types";
import { PanelHeader } from "../_components";
import { saveBrandLayout } from "./layout-actions";
import styles from "./brand-layout.module.css";

type Selection = { from: number } | { brandId: string } | null;

export function BrandLayoutManager({ brands, slotCount }: { brands: BrandRow[]; slotCount: number }) {
  const initial = () => featuredBrandSlots(brands.filter((brand) => brand.show_in_featured_brands), slotCount).map((brand) => brand?.id ?? null);
  const [saved, setSaved] = useState<BrandSlot[]>(initial);
  const [slots, setSlots] = useState<BrandSlot[]>(initial);
  const [selection, setSelection] = useState<Selection>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const suppressClick = useRef(false);
  const drag = useRef<{ from: number; x: number; y: number; moved: boolean } | null>(null);
  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  const available = brands.filter((brand) => brand.is_active && !slots.includes(brand.id));
  const dirty = JSON.stringify(slots) !== JSON.stringify(saved);

  function change(next: BrandSlot[]) {
    setSlots(next); setSelection(null); setTarget(null); setMessage(""); setError("");
  }
  function place(to: number, chosen = selection) {
    if (busy || !chosen) return;
    if ("from" in chosen) change(moveBrandSlot(slots, chosen.from, to));
    else if (slots[to] === null) change(placeBrandInSlot(slots, chosen.brandId, to));
  }
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await saveBrandLayout(saved, slots);
      if (result.error) setError(result.error);
      else { setSaved([...slots]); setSelection(null); setMessage("Disposition enregistrée."); }
    } catch { setError("La disposition n’a pas été enregistrée. Réessayez."); }
    finally { setBusy(false); }
  }
  const selectedName = selection ? "from" in selection ? byId.get(slots[selection.from] ?? "")?.name : byId.get(selection.brandId)?.name : null;

  return <section className={`admin-panel ${styles.panel}`} aria-label="Disposition des marques">
    <PanelHeader title="Les marques qui font la différence" description="Glissez les logos entre les cases. Sur mobile ou au clavier, sélectionnez une marque puis sa case de destination." />
    <div className={styles.body}>
      <p className={styles.hint}>Les cases occupées échangent leurs logos. Aucune autre case ne bouge. Retirer un logo conserve sa case vide et ne supprime jamais la marque.</p>
      <div className={styles.toolbar}>
        <button type="button" className="admin-secondary" disabled={busy || slots.length >= 1000} onClick={() => change([...slots, null])}><Plus size={16} /> Ajouter une case vide</button>
        {slots.length > 0 && slots.at(-1) === null ? <button type="button" className="admin-secondary" disabled={busy} onClick={() => change(slots.slice(0, -1))}>Retirer la dernière case vide</button> : null}
        <button type="button" className="admin-primary" disabled={!dirty || busy} onClick={() => void save()}>{busy ? "Enregistrement…" : "Enregistrer la disposition"}</button>
        {dirty ? <button type="button" className="admin-secondary" disabled={busy} onClick={() => change([...saved])}>Annuler les modifications</button> : null}
      </div>
      <p role="status" className={styles.feedback}>{message || (selectedName ? `${selectedName} sélectionnée : choisissez une case.` : dirty ? "Modifications non enregistrées." : "Disposition enregistrée : de gauche à droite, puis ligne suivante.")}</p>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <div className={`brand-list ${styles.grid}`} aria-label="Cases de la section marques" aria-busy={busy}>
        {slots.map((id, index) => {
          const brand = id ? byId.get(id) : undefined;
          const selected = selection && "from" in selection && selection.from === index;
          const canPlace = selection && ("from" in selection ? selection.from !== index : !brand);
          return <div key={index} data-brand-slot={index} className={`brand-logo ${brand ? `brand-${brand.slug}` : ""} ${styles.slot} ${selected ? styles.selected : ""} ${target === index ? styles.target : ""}`}>
            <small className={styles.slotLabel}>Case {index + 1}</small>
            <div className={styles.artwork}>{brand ? <BrandLogo brand={brand} /> : <span className={styles.empty}>Case vide</span>}</div>
            {brand ? <>
              <span className={styles.brandName}>{brand.name}{!brand.is_active ? " — inactive, masquée sur le site" : ""}</span>
              <div className={styles.slotActions}>
                <button type="button" className={styles.handle} disabled={busy} aria-pressed={Boolean(selected)} aria-label={`Déplacer ${brand.name} depuis la case ${index + 1}`} onClick={(event) => { if (event.detail > 0 && suppressClick.current) { suppressClick.current = false; return; } setSelection({ from: index }); }}
                  onPointerDown={(event) => {
                    if (busy || event.button !== 0) return;
                    suppressClick.current = false;
                    drag.current = { from: index, x: event.clientX, y: event.clientY, moved: false };
                    setSelection({ from: index });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const moving = drag.current;
                    if (!moving) return;
                    moving.moved ||= Math.hypot(event.clientX - moving.x, event.clientY - moving.y) > 5;
                    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-brand-slot]");
                    setTarget(cell ? Number(cell.dataset.brandSlot) : null);
                  }}
                  onPointerUp={(event) => {
                    const moving = drag.current;
                    drag.current = null; setTarget(null);
                    if (!moving?.moved) return;
                    suppressClick.current = true;
                    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-brand-slot]");
                    if (cell) place(Number(cell.dataset.brandSlot), { from: moving.from });
                    // Suppress the click following a completed pointer drag.
                    event.preventDefault();
                  }}
                  onPointerCancel={() => { drag.current = null; setTarget(null); }}><GripVertical size={16} /> Déplacer</button>
                <button type="button" disabled={busy} aria-label={`Retirer ${brand.name} de la section`} onClick={() => change(slots.map((slot, i) => i === index ? null : slot))}><X size={15} /> Retirer</button>
              </div>
            </> : null}
            {canPlace ? <button type="button" className={styles.place} disabled={busy} aria-label={`${brand ? "Échanger avec" : "Placer dans"} la case ${index + 1}`} onClick={() => place(index)}>{brand ? "Échanger ici" : "Placer ici"}</button> : null}
          </div>;
        })}
      </div>
      {!slots.length ? <p>Aucune case. Ajoutez une case vide pour commencer.</p> : null}
      <div className={styles.available}>
        <h3>Marques disponibles</h3>
        <p>Sélectionnez une marque, puis une case vide. Les nouvelles marques restent ici jusqu’à leur ajout explicite.</p>
        <div className={styles.picker}>
          {available.map((brand) => <button key={brand.id} type="button" disabled={busy} className={selection && "brandId" in selection && selection.brandId === brand.id ? styles.chosen : ""} aria-pressed={Boolean(selection && "brandId" in selection && selection.brandId === brand.id)} onClick={() => { setSelection({ brandId: brand.id }); setMessage(""); setError(""); }}>{brand.name}</button>)}
          {!available.length ? <span>Aucune autre marque active disponible.</span> : null}
        </div>
        {selection ? <button type="button" className="admin-secondary" disabled={busy} onClick={() => { setSelection(null); setTarget(null); }}>Annuler la sélection</button> : null}
      </div>
    </div>
  </section>;
}
