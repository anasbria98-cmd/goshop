"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { colorVariantListSchema, type ColorVariantDraft } from "@/lib/variant-input";
import "@/components/product-variants.css";

export function ColorVariants({ initialRows = [], choices = [], onBusy }: {
  initialRows?: ColorVariantDraft[];
  choices?: { name: string; hex: string }[];
  onBusy: (busy: boolean) => void;
}) {
  const [rows, setRows] = useState(() => initialRows.map((row) => ({ ...row, key: row.id! })));
  const [uploading, setUploading] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = useRef(new Set<string>());
  const update = (key: string, patch: Partial<ColorVariantDraft>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch, dirty: true } : row));
  const payload = rows.filter((row) => row.dirty).map((row) => ({
    id: row.id, name: `${row.color_name}${row.finish ? ` · ${row.finish}` : ""}`, color_name: row.color_name,
    color_hex: row.color_hex, finish: row.finish, image_path: row.image_path, sku: row.sku, barcode: row.barcode,
    price: row.price.trim() ? Number(row.price) : null, is_active: row.is_active,
    compare_at_price: row.compare_at_price?.trim() ? Number(row.compare_at_price) : null,
    stock: !row.id || row.stock !== row.expected_stock ? row.stock : null,
    expected_stock: row.id ? row.expected_stock : null,
  }));
  const validation = colorVariantListSchema.safeParse(payload);
  const allChoices = [...new Map([...choices, ...rows.filter((row) => row.color_name).map((row) => ({ name: row.color_name, hex: row.color_hex }))].map((color) => [color.name, color])).values()];

  async function upload(key: string, file?: File) {
    if (!file) return;
    const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[file.type];
    if (!extension || file.size > 8 * 1024 * 1024) { setErrors((e) => ({ ...e, [key]: "Choisissez une image PNG, JPEG ou WebP de 8 Mo maximum." })); return; }
    busy.current.add(key); setUploading([...busy.current]); onBusy(true);
    setErrors((e) => ({ ...e, [key]: "" }));
    try {
      const path = `variants/${crypto.randomUUID()}.${extension}`;
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      update(key, { image_path: path });
    } catch (error) { setErrors((e) => ({ ...e, [key]: error instanceof Error ? error.message : "L’import de l’image a échoué." })); }
    finally { busy.current.delete(key); setUploading([...busy.current]); onBusy(busy.current.size > 0); }
  }

  return <section className="admin-panel product-step admin-color-variants" id="variants" aria-labelledby="color-variants-title">
    <div className="admin-panel-heading"><div><h2 id="color-variants-title">Variantes</h2></div><p>Couleurs propres à ce produit Appareillage. Enregistrez le produit pour valider les modifications.</p></div>
    <input type="hidden" name="color_variants" value={JSON.stringify(payload)} />
    {rows.length === 0 ? <p className="admin-category-help">Aucune couleur configurée. Le produit conserve son SKU principal.</p> : null}
    <datalist id="existing-product-colors">{allChoices.map((color) => <option key={color.name} value={color.name} />)}</datalist>
    <datalist id="product-color-finishes">{["Mat", "Brillant", "Satiné", "Métallisé"].map((finish) => <option key={finish} value={finish} />)}</datalist>
    {rows.map((row, index) => <fieldset className="admin-color-variant" key={row.key} disabled={uploading.includes(row.key)}>
      <legend>{row.color_name || row.name || `Couleur ${index + 1}`}{!row.is_active ? " — Inactive" : ""}</legend>
      <div className="admin-form-grid">
        <label>Couleur<input list="existing-product-colors" value={row.color_name} required={row.dirty} placeholder="Sélectionner ou créer une couleur" onChange={(event) => { const color_name = event.target.value; const existing = allChoices.find((c) => c.name === color_name); update(row.key, { color_name, ...(existing ? { color_hex: existing.hex } : {}) }); }} /></label>
        <label>Code HEX<span className="admin-color-hex"><input type="color" aria-label={`Couleur HEX ${index + 1}`} value={/^#[0-9a-fA-F]{6}$/.test(row.color_hex) ? row.color_hex : "#ffffff"} onChange={(event) => update(row.key, { color_hex: event.target.value })} /><input aria-label={`Code HEX ${index + 1}`} value={row.color_hex} pattern="#[0-9a-fA-F]{6}" onChange={(event) => update(row.key, { color_hex: event.target.value })} /></span></label>
        <label>Finition (facultatif)<input list="product-color-finishes" value={row.finish} onChange={(event) => update(row.key, { finish: event.target.value })} /></label>
        <label>SKU<input value={row.sku} required={row.dirty} onChange={(event) => update(row.key, { sku: event.target.value })} /></label>
        <label>Code-barres<input value={row.barcode} onChange={(event) => update(row.key, { barcode: event.target.value })} /></label>
        <label>Prix (DH)<input type="number" min="0" step="0.01" value={row.price} placeholder="Prix du produit" onChange={(event) => update(row.key, { price: event.target.value })} /><small>Vide : utiliser le prix du produit.</small></label>
        <label>Prix barré (DH)<input type="number" min="0" step="0.01" value={row.compare_at_price ?? ""} onChange={(event) => update(row.key, { compare_at_price: event.target.value })} /></label>
        <label>Stock total<input type="number" min={Math.min(row.expected_stock, row.reserved)} step="1" value={row.stock} onChange={(event) => update(row.key, { stock: Number(event.target.value) })} /><small>{row.reserved} réservé(s) · {Math.max(0, row.stock - row.reserved)} disponible(s)</small></label>
        <label className="admin-checkbox"><input type="checkbox" checked={row.is_active} onChange={(event) => update(row.key, { is_active: event.target.checked })} /> Couleur active</label>
      </div>
      <div className="admin-variant-image-upload">
        {row.image_path ? <Image src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${row.image_path}`} alt={`Image ${row.color_name || row.name}`} width={96} height={96} /> : null}
        <label><span><Upload size={16} aria-hidden="true" /> {uploading.includes(row.key) ? "Import en cours…" : "Image réelle de cette couleur"}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void upload(row.key, event.target.files?.[0]); event.target.value = ""; }} /></label>
      </div>
      {errors[row.key] ? <p className="admin-validation-message" role="alert">{errors[row.key]}</p> : null}
      {!row.id ? <button type="button" className="admin-danger-link" onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}>Retirer cette couleur non enregistrée</button> : <small>Les variantes existantes sont conservées ; désactivez-les pour les masquer.</small>}
    </fieldset>)}
    {payload.length && !validation.success ? <p className="admin-validation-message" role="status">Complétez la couleur, son code HEX, son SKU et son image avant d’enregistrer.</p> : null}
    <button type="button" className="admin-secondary" onClick={() => setRows((current) => [...current, { key: crypto.randomUUID(), name: "", color_name: "", color_hex: "#ffffff", finish: "", image_path: "", sku: "", barcode: "", price: "", stock: 0, expected_stock: 0, reserved: 0, is_active: true, dirty: true }])}><Plus size={16} aria-hidden="true" /> Ajouter une couleur</button>
  </section>;
}
