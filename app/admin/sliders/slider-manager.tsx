"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { moveSlide, type HomeSlideRow, type SlideLocation } from "@/lib/home-slides";
import { deleteSlide, reorderSlides, saveSlide, toggleSlide } from "./actions";
import styles from "./sliders.module.css";

type Destination = { id: string; name: string; path?: string; slug?: string };
type Draft = Omit<HomeSlideRow, "id" | "created_at" | "updated_at" | "sort_order"> & { id?: string };
const empty = (location: SlideLocation): Draft => ({ name: "", alt: "", image_url: "", location, link_type: "none", category_id: null, product_id: null, custom_url: null, is_active: true });
const locations = [["primary", "Grande bannière · gauche", "Omega / Galaxy · format paysage"], ["secondary", "Petite bannière · droite", "Karla / Millenium · format carré"]] as const;

export function SliderManager({ initialSlides, categories, products }: { initialSlides: HomeSlideRow[]; categories: Destination[]; products: Destination[] }) {
  const router = useRouter();
  const [slides, setSlides] = useState(initialSlides);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const [previousSlides, setPreviousSlides] = useState(initialSlides);
  if (previousSlides !== initialSlides) { setPreviousSlides(initialSlides); setSlides(initialSlides); }
  const previewRef = useRef("");
  const editorKey = draft ? draft.id ?? "new" : null;
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  useEffect(() => { if (editorKey) { editor.current?.scrollIntoView({ block: "start" }); editor.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true }); } }, [editorKey]);
  function selectFile(value: File | null) { if (previewRef.current) URL.revokeObjectURL(previewRef.current); previewRef.current = value ? URL.createObjectURL(value) : ""; setPreview(previewRef.current); setFile(value); }
  function edit(row: Draft) { selectFile(null); setError(""); setNotice(""); setDraft({ ...row }); }
  async function run(task: () => Promise<{ error?: string }>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try { const result = await task(); if (result.error) { setError(result.error); return false; } setNotice(success); router.refresh(); return true; }
    catch { setError("Connexion interrompue. Vérifiez votre connexion et réessayez."); return false; }
    finally { setBusy(false); }
  }
  async function order(location: SlideLocation, rows: HomeSlideRow[]) {
    const ok = await run(() => reorderSlides(location, rows.map((row) => row.id)), "Ordre enregistré.");
    if (ok) setSlides((current) => [...current.filter((row) => row.location !== location), ...rows.map((row, index) => ({ ...row, sort_order: index }))]);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!draft) return;
    const current = draft;
    await run(async () => {
      let image = current.image_url;
      if (file) {
        if (file.size > 8388608 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { error: "Choisissez une image JPG, PNG ou WebP de 8 Mo maximum." };
        try { const bitmap = await createImageBitmap(file); bitmap.close(); } catch { return { error: "Le fichier ne contient pas une image valide." }; }
        const db = createSupabaseBrowserClient();
        const path = `${crypto.randomUUID()}.${file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"}`;
        const { error: uploadError } = await db.storage.from("homepage-slides").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) return { error: "Import impossible. Vérifiez votre session administrateur et réessayez." };
        image = db.storage.from("homepage-slides").getPublicUrl(path).data.publicUrl;
        // Retain a successful upload if metadata validation fails, so retrying does not upload twice.
        setDraft((value) => value ? { ...value, image_url: image } : value); selectFile(null);
      }
      const result = await saveSlide({ ...current, image_url: image });
      if (result.error) return result;
      if (result.slide) setSlides((rows) => [...rows.filter((row) => row.id !== result.slide!.id), result.slide!].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)));
      setDraft(null); selectFile(null); return {};
    }, "Bannière enregistrée.");
  }
  function patch(values: Partial<Draft>) { setDraft((current) => current ? { ...current, ...values } : current); }
  return <>
    <p className={styles.hint}>Les bannières actives sont visibles sur l’accueil. Glissez la poignée pour réorganiser, ou utilisez les flèches sur mobile et au clavier.</p>
    <div role="status" aria-live="polite">{notice ? <p className={styles.success}>{notice}</p> : null}</div>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <div className={styles.locations}>
      {locations.map(([location, label, description]) => {
        const rows = slides.filter((row) => row.location === location);
        return <section className="admin-panel" key={location} aria-label={label}>
          <header className={styles.sectionHeader}><div><h2>{label}</h2><p>{description}</p></div><button className="admin-primary" disabled={busy} onClick={() => edit(empty(location))}><Plus size={16} /> Ajouter</button></header>
          {!rows.length ? <p className={styles.hint}>Aucune bannière. Cet emplacement restera vide.</p> : <ol className={styles.list}>
            {rows.map((row, index) => <li key={row.id} className={`${styles.card}${dragged === row.id ? ` ${styles.dragging}` : ""}`} onDragOver={(event) => { if (rows.some((item) => item.id === dragged)) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (!busy && dragged && dragged !== row.id && rows.some((item) => item.id === dragged)) void order(location, moveSlide(rows, dragged, row.id)); setDragged(null); }}>
              <div className={styles.cardTop}><button type="button" className={styles.handle} draggable={!busy} disabled={busy} aria-label={`Glisser ${row.name} pour réorganiser`} title="Glisser pour réorganiser" onDragStart={(event) => { setDragged(row.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", row.id); }} onDragEnd={() => setDragged(null)}><GripVertical size={20} /></button><strong>{index + 1}. {row.name}</strong><span className={row.is_active ? styles.active : styles.inactive}>{row.is_active ? "Active" : "Inactive"}</span></div>
              <div className={`${styles.preview} ${location === "secondary" ? styles.square : ""}`}><Image src={row.image_url} alt={row.alt} fill sizes="(max-width: 700px) 90vw, 450px" /></div>
              <div className={styles.actions}>
                <button type="button" disabled={busy || index === 0} onClick={() => void order(location, moveSlide(rows, row.id, rows[index - 1].id))} aria-label={`Monter ${row.name}`}><ArrowUp size={16} /></button>
                <button type="button" disabled={busy || index === rows.length - 1} onClick={() => void order(location, moveSlide(rows, row.id, rows[index + 1].id))} aria-label={`Descendre ${row.name}`}><ArrowDown size={16} /></button>
                <button type="button" disabled={busy} onClick={() => edit(row)}><Pencil size={15} /> Modifier</button>
                <button type="button" disabled={busy} onClick={() => void run(async () => { const result = await toggleSlide(row.id, !row.is_active); if (!result.error) setSlides((items) => items.map((item) => item.id === row.id ? { ...item, is_active: !item.is_active } : item)); return result; }, row.is_active ? "Bannière désactivée." : "Bannière activée.")}>{row.is_active ? "Désactiver" : "Activer"}</button>
                <button type="button" disabled={busy} className={styles.danger} aria-label={`Supprimer ${row.name}`} onClick={() => setConfirmDelete(row.id)}><Trash2 size={15} /></button>
              </div>
              {confirmDelete === row.id ? <div className={styles.deleteConfirmation} role="alert"><p>Supprimer « {row.name} » ? Le fichier image sera conservé.</p><div className={styles.actions}><button type="button" disabled={busy} className={styles.danger} onClick={() => void run(async () => { const result = await deleteSlide(row.id); if (!result.error) { setSlides((items) => items.filter((item) => item.id !== row.id)); setConfirmDelete(null); if (draft?.id === row.id) setDraft(null); } return result; }, "Bannière supprimée.")}>Confirmer la suppression</button><button type="button" disabled={busy} onClick={() => setConfirmDelete(null)}>Annuler la suppression</button></div></div> : null}
            </li>)}
          </ol>}
        </section>;
      })}
    </div>
    {draft ? <div ref={editor} className={`admin-panel ${styles.editor}`}>
      <h2>{draft.id ? "Modifier la bannière" : "Nouvelle bannière"}</h2>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className={styles.fields}>
          <label>Nom de la bannière<input name="name" value={draft.name} maxLength={120} required onChange={(event) => patch({ name: event.target.value })} /></label>
          <label>Emplacement<select value={draft.location} onChange={(event) => patch({ location: event.target.value as SlideLocation })}>{locations.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className={styles.full}>Texte alternatif de l’image<input value={draft.alt} maxLength={300} required onChange={(event) => patch({ alt: event.target.value })} /></label>
          <label className={`${styles.upload} ${styles.full}`}><ImagePlus size={22} /><span>{draft.image_url ? "Remplacer l’image" : "Importer une image"} · JPG, PNG, WebP · 8 Mo maximum</span><input type="file" accept="image/png,image/jpeg,image/webp" required={!draft.image_url} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /></label>
          {(preview || draft.image_url) ? <div className={`${styles.preview} ${styles.full} ${draft.location === "secondary" ? styles.square : ""}`}><Image src={preview || draft.image_url} alt={draft.alt || "Aperçu de la bannière"} fill unoptimized sizes="90vw" /></div> : null}
          <label>Destination<select value={draft.link_type} onChange={(event) => patch({ link_type: event.target.value as Draft["link_type"] })}><option value="none">Aucun lien</option><option value="category">Catégorie</option><option value="product">Produit</option><option value="custom">URL personnalisée</option></select></label>
          {draft.link_type === "category" ? <label>Catégorie<select required value={draft.category_id ?? ""} onChange={(event) => patch({ category_id: event.target.value || null })}><option value="">Choisir une catégorie</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.path} — {item.name}</option>)}</select></label> : null}
          {draft.link_type === "product" ? <label>Produit publié<select required value={draft.product_id ?? ""} onChange={(event) => patch({ product_id: event.target.value || null })}><option value="">Choisir un produit</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.slug}</option>)}</select></label> : null}
          {draft.link_type === "custom" ? <label>Lien personnalisé<input required value={draft.custom_url ?? ""} placeholder="/recherche ou https://…" onChange={(event) => patch({ custom_url: event.target.value })} /></label> : null}
          <label className={`${styles.check} ${styles.full}`}><input type="checkbox" checked={draft.is_active} onChange={(event) => patch({ is_active: event.target.checked })} /> Afficher cette bannière sur l’accueil</label>
          <div className={`${styles.actions} ${styles.full}`}><button className="admin-primary" type="submit">{busy ? "Enregistrement…" : "Enregistrer la bannière"}</button><button type="button" onClick={() => { setDraft(null); selectFile(null); }}>Annuler</button></div>
        </fieldset>
      </form>
    </div> : null}
    <p className={styles.hint}>La suppression d’une bannière conserve son fichier image pour éviter toute perte de média partagé.</p>
  </>;
}
