"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Plus, Search, Sparkles, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { colorVariantListSchema, colorVariantSchema, type ColorVariantDraft } from "@/lib/variant-input";
import { colorChoices as buildColorChoices, colorFromFilename, dominantProductColor, nearestColor, normalizeColorName, suggestVariantSku, type ColorChoice } from "@/lib/color-suggestions";
import "@/components/product-variants.css";

type DraftRow = ColorVariantDraft & { key: string; autoSku: boolean };
type Suggestion = { color: ColorChoice; source: "filename" | "image" };

function variantPayload(row: ColorVariantDraft) {
  return {
    id: row.id, name: `${row.color_name}${row.finish ? ` · ${row.finish}` : ""}`, color_name: row.color_name,
    color_hex: row.color_hex, finish: row.finish, image_path: row.image_path, sku: row.sku, barcode: row.barcode,
    price: row.price.trim() ? Number(row.price) : null, is_active: row.is_active,
    compare_at_price: row.compare_at_price?.trim() ? Number(row.compare_at_price) : null,
    stock: !row.id || row.stock !== row.expected_stock ? row.stock : null,
    expected_stock: row.id ? row.expected_stock : null,
  };
}

function ColorChip({ color, onClick, disabled, label }: { color: ColorChoice; onClick: () => void; disabled?: boolean; label?: string }) {
  return <button type="button" className="admin-color-chip" onClick={onClick} disabled={disabled} aria-label={label}>
    <span aria-hidden="true" style={{ backgroundColor: color.hex }} />{color.name}{disabled ? <Check size={12} aria-hidden="true" /> : null}
  </button>;
}

export function ColorVariants({ initialRows = [], choices = [], baseSku = "", onBusy, onValidityChange, saveError }: {
  initialRows?: ColorVariantDraft[];
  choices?: ColorChoice[];
  baseSku?: string;
  onBusy: (busy: boolean) => void;
  onValidityChange: (valid: boolean) => void;
  saveError?: string | null;
}) {
  const [rows, setRows] = useState<DraftRow[]>(() => initialRows.map((row) => ({ ...row, key: row.id!, autoSku: false })));
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [estimating, setEstimating] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion | undefined>>({});
  const [notices, setNotices] = useState<Record<string, string>>({});
  const busy = useRef(new Set<string>());
  const saveErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (saveError) saveErrorRef.current?.focus(); }, [saveError]);
  const imageFiles = useRef(new Map<string, File>());
  const payload = rows.filter((row) => row.dirty).map(variantPayload);
  const validation = colorVariantListSchema.safeParse(payload);
  const skuCounts = new Map<string, number>();
  for (const row of rows) if (row.sku.trim()) skuCounts.set(row.sku.trim(), (skuCounts.get(row.sku.trim()) ?? 0) + 1);
  const duplicateSkus = new Set([...skuCounts].filter(([, count]) => count > 1).map(([sku]) => sku));
  const valid = validation.success && duplicateSkus.size === 0;
  useEffect(() => { onValidityChange(valid); }, [valid, onValidityChange]);
  const allChoices = buildColorChoices(choices, rows.map((row) => ({ name: row.color_name, hex: row.color_hex })));
  const filteredChoices = allChoices.filter((color) => normalizeColorName(color.name).includes(normalizeColorName(query)));
  const palette = query || showAll ? filteredChoices : filteredChoices.slice(0, 6);

  function update(key: string, patch: Partial<ColorVariantDraft> & { autoSku?: boolean }) {
    setRows((current) => current.map((row) => {
      if (row.key !== key) return row;
      const next = { ...row, ...patch, dirty: true };
      if (next.autoSku && ("color_name" in patch || "finish" in patch)) {
        next.sku = suggestVariantSku(baseSku, next.color_name, next.finish, current.filter((r) => r.key !== key).map((r) => r.sku));
      }
      return next;
    }));
  }

  function add(color?: ColorChoice, source?: DraftRow) {
    const key = crypto.randomUUID();
    setRows((current) => [...current, {
      key, autoSku: true, name: "", color_name: color?.name ?? source?.color_name ?? "", color_hex: color?.hex ?? source?.color_hex ?? "#ffffff",
      finish: source?.finish ?? "", image_path: "", sku: suggestVariantSku(baseSku, color?.name ?? source?.color_name ?? "", source?.finish ?? "", current.map((row) => row.sku)),
      barcode: "", price: source?.price ?? "", compare_at_price: source?.compare_at_price ?? "",
      stock: 0, expected_stock: 0, reserved: 0, is_active: true, dirty: true,
    }]);
    setOpenKeys((current) => new Set(current).add(key));
  }

  function remove(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
    setOpenKeys((current) => { const next = new Set(current); next.delete(key); return next; });
    imageFiles.current.delete(key);
  }

  async function upload(key: string, file?: File) {
    if (!file) return;
    const extension = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[file.type];
    if (!extension || file.size > 8 * 1024 * 1024) { setErrors((e) => ({ ...e, [key]: "Choisissez une image PNG, JPEG ou WebP de 8 Mo maximum." })); return; }
    imageFiles.current.set(key, file);
    const detected = colorFromFilename(file.name, allChoices);
    setSuggestions((current) => ({ ...current, [key]: detected ? { color: detected, source: "filename" } : undefined }));
    setNotices((current) => ({ ...current, [key]: "" }));
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

  async function estimateColor(row: DraftRow) {
    setEstimating((current) => [...current, row.key]);
    setNotices((current) => ({ ...current, [row.key]: "" }));
    try {
      let source: Blob | undefined = imageFiles.current.get(row.key);
      if (!source) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${row.image_path}`);
        if (!response.ok) throw new Error("L’image n’a pas pu être analysée.");
        source = await response.blob();
      }
      const image = await createImageBitmap(source);
      try {
        const scale = Math.min(1, 96 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(4, Math.round(image.width * scale)); canvas.height = Math.max(4, Math.round(image.height * scale));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Analyse indisponible dans ce navigateur.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const hex = dominantProductColor(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        setSuggestions((current) => ({ ...current, [row.key]: hex ? { color: nearestColor(hex, allChoices), source: "image" } : undefined }));
        if (!hex) setNotices((current) => ({ ...current, [row.key]: "Le fond ou les détails ne permettent pas une estimation fiable. Choisissez la couleur manuellement." }));
      } finally { image.close(); }
    } catch (error) { setNotices((current) => ({ ...current, [row.key]: error instanceof Error ? error.message : "Choisissez la couleur manuellement." })); }
    finally { setEstimating((current) => current.filter((key) => key !== row.key)); }
  }

  return <section className="admin-panel product-step admin-color-variants" id="variants" aria-labelledby="color-variants-title">
    <div className="admin-panel-heading"><div><h2 id="color-variants-title">Variantes</h2></div><p>Choisissez les couleurs, ajoutez leurs vraies photos, puis enregistrez le produit.</p></div>
    {saveError ? <p ref={saveErrorRef} tabIndex={-1} className="admin-validation-message" role="alert">{saveError}</p> : null}
    <input type="hidden" name="color_variants" value={JSON.stringify(payload)} />
    <div className="admin-color-quick-add">
      <div className="admin-color-toolbar"><strong>Ajouter rapidement une couleur</strong><span>{rows.length} couleur{rows.length > 1 ? "s" : ""}</span></div>
      <label className="admin-color-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Rechercher une couleur à ajouter" placeholder="Rechercher une couleur…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="admin-color-palette" aria-label="Couleurs à ajouter">
        {palette.map((color) => {
          const used = rows.some((row) => normalizeColorName(row.color_name) === normalizeColorName(color.name));
          return <ColorChip key={normalizeColorName(color.name)} color={color} disabled={used} label={used ? `${color.name} déjà ajoutée` : `Ajouter ${color.name}`} onClick={() => add(color)} />;
        })}
      </div>
      {!filteredChoices.length ? <p className="admin-color-help">Aucune suggestion. Ajoutez une couleur personnalisée ci-dessous.</p> : null}
      {!query && !showAll && filteredChoices.length > 6 ? <button className="admin-color-text-button" type="button" onClick={() => setShowAll(true)}>Toutes les couleurs</button> : null}
      <p className="admin-color-help">Vos couleurs enregistrées sont proposées en priorité. Les autres nuances sont indicatives et restent modifiables.</p>
    </div>
    {!rows.length ? <p className="admin-category-help">Aucune couleur configurée. Le produit conserve son SKU principal.</p> : null}
    <datalist id="product-color-finishes">{["Mat", "Brillant", "Satiné", "Métallisé"].map((finish) => <option key={finish} value={finish} />)}</datalist>
    <div className="admin-color-cards">
      {rows.map((row, index) => {
        const open = openKeys.has(row.key);
        const complete = colorVariantSchema.safeParse(variantPayload(row)).success;
        const duplicate = duplicateSkus.has(row.sku.trim());
        const suggestion = suggestions[row.key];
        const colorMatches = allChoices.filter((color) => !row.color_name || normalizeColorName(color.name).includes(normalizeColorName(row.color_name))).slice(0, 6);
        const title = row.color_name || `Couleur ${index + 1}`;
        return <fieldset className="admin-color-variant" key={row.key} disabled={uploading.includes(row.key)}>
          <legend className="admin-color-legend"><span aria-hidden="true" style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(row.color_hex) ? row.color_hex : "#ffffff" }} />{title}{row.finish ? ` · ${row.finish}` : ""}</legend>
          <div className="admin-color-overview">
            <div><strong>{row.price.trim() ? `${Number(row.price).toLocaleString("fr-MA")} DH` : "Prix du produit"}</strong><span>{Math.max(0, row.stock - row.reserved)} disponible(s) · {row.sku || "Référence à compléter"}</span></div>
            <span className={complete && !duplicate ? "admin-color-state" : "admin-color-state admin-color-state--pending"}>{!row.is_active ? "Inactive" : !complete || duplicate ? "À compléter" : row.dirty ? "Prête à enregistrer" : "Enregistrée"}</span>
          </div>
          <div className="admin-color-row-actions">
            <button type="button" className="admin-secondary" aria-expanded={open} aria-controls={`variant-fields-${row.key}`} onClick={() => setOpenKeys((current) => { const next = new Set(current); if (next.has(row.key)) next.delete(row.key); else next.add(row.key); return next; })}><ChevronDown size={14} aria-hidden="true" />{open ? `Réduire ${title}` : `Modifier ${title}`}</button>
            <button type="button" className="admin-color-text-button" onClick={() => add(undefined, row)} aria-label={`Dupliquer ${title}`}><Copy size={14} aria-hidden="true" />Dupliquer</button>
            <button type="button" className="admin-color-text-button" onClick={() => update(row.key, { is_active: !row.is_active })} aria-label={`${row.is_active ? "Désactiver" : "Activer"} ${title}`}>{row.is_active ? "Désactiver" : "Activer"}</button>
          </div>
          <fieldset className="admin-color-fields" id={`variant-fields-${row.key}`} hidden={!open} disabled={!open}>
            <div className="admin-form-grid">
              <div className="admin-color-name-field">
                <label>Couleur<input value={row.color_name} required={row.dirty && open} placeholder="Choisir ou écrire une couleur" onChange={(event) => {
                  const color_name = event.target.value;
                  const existing = allChoices.find((color) => normalizeColorName(color.name) === normalizeColorName(color_name));
                  update(row.key, { color_name, ...(existing ? { color_hex: existing.hex } : {}) });
                }} /></label>
                <div className="admin-color-palette admin-color-palette--small" aria-label={`Suggestions pour ${title}`}>
                  {colorMatches.map((color) => <ColorChip key={normalizeColorName(color.name)} color={color} label={`Choisir ${color.name} pour ${title}`} onClick={() => update(row.key, { color_name: color.name, color_hex: color.hex })} />)}
                </div>
              </div>
              <label>Nuance / code HEX<span className="admin-color-hex"><input type="color" aria-label={`Couleur HEX ${index + 1}`} value={/^#[0-9a-fA-F]{6}$/.test(row.color_hex) ? row.color_hex.toLowerCase() : "#ffffff"} onChange={(event) => update(row.key, { color_hex: event.target.value })} /><input aria-label={`Code HEX ${index + 1}`} value={row.color_hex} pattern="#[0-9a-fA-F]{6}" onChange={(event) => update(row.key, { color_hex: event.target.value })} /></span><small>La photo originale n’est jamais recolorée.</small></label>
              <label>Finition (facultatif)<input list="product-color-finishes" value={row.finish} placeholder="Mat, brillant…" onChange={(event) => update(row.key, { finish: event.target.value })} /></label>
              <div className="admin-color-name-field"><label>SKU / référence de la variante<input value={row.sku} required={row.dirty && open} maxLength={80} aria-invalid={duplicate || undefined} onChange={(event) => update(row.key, { sku: event.target.value, autoSku: false })} /><small>{duplicate ? "Cette référence est déjà utilisée par une autre couleur." : row.autoSku ? "Référence suggérée, modifiable. Les références enregistrées restent inchangées." : "Référence unique pour cette variante."}</small></label>{baseSku ? <button type="button" className="admin-color-text-button" onClick={() => update(row.key, { sku: suggestVariantSku(baseSku, row.color_name, row.finish, rows.filter((r) => r.key !== row.key).map((r) => r.sku)), autoSku: true })}>Suggérer une référence</button> : null}</div>
              <label>Code-barres<input value={row.barcode} onChange={(event) => update(row.key, { barcode: event.target.value })} /></label>
              <label>Prix (DH)<input type="number" min="0" step="0.01" value={row.price} placeholder="Prix du produit" onChange={(event) => update(row.key, { price: event.target.value })} /><small>Vide : utiliser le prix du produit.</small></label>
              <label>Prix barré (DH)<input type="number" min="0" step="0.01" value={row.compare_at_price ?? ""} onChange={(event) => update(row.key, { compare_at_price: event.target.value })} /></label>
              <label>Stock total<input type="number" min={Math.min(row.expected_stock, row.reserved)} step="1" value={row.stock} onChange={(event) => update(row.key, { stock: Number(event.target.value) })} /><small>{row.reserved} réservé(s) · {Math.max(0, row.stock - row.reserved)} disponible(s)</small></label>
            </div>
            <div className="admin-variant-image-upload">
              {row.image_path ? <Image src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${row.image_path}`} alt={`Image ${title}`} width={96} height={96} /> : <span className="admin-color-image-empty"><Upload size={24} aria-hidden="true" />Photo manquante</span>}
              <div><label><span><Upload size={16} aria-hidden="true" />{uploading.includes(row.key) ? "Import en cours…" : row.image_path ? "Remplacer la photo" : "Ajouter la photo réelle"}</span><input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Photo de ${title}`} onChange={(event) => { void upload(row.key, event.target.files?.[0]); event.target.value = ""; }} /></label><small>PNG, JPEG ou WebP · 8 Mo maximum</small></div>
            </div>
            {row.image_path ? <button type="button" className="admin-secondary" disabled={estimating.includes(row.key)} onClick={() => { void estimateColor(row); }}><Sparkles size={15} aria-hidden="true" />{estimating.includes(row.key) ? "Analyse en cours…" : "Suggérer depuis la photo"}</button> : null}
            {suggestion ? <div className="admin-color-suggestion" role="status">
              <div><strong>{suggestion.source === "filename" ? "Couleur repérée dans le nom du fichier" : "Nuance estimée depuis la photo"}</strong><p>{suggestion.source === "image" ? "Le fond et les détails peuvent influencer l’estimation. Confirmez la couleur avant de l’utiliser." : "Vérifiez qu’elle correspond bien au produit."}</p></div>
              <ColorChip color={suggestion.color} label={`Utiliser la suggestion ${suggestion.color.name} pour ${title}`} onClick={() => { update(row.key, { color_name: suggestion.color.name, color_hex: suggestion.color.hex }); setSuggestions((current) => ({ ...current, [row.key]: undefined })); }} />
            </div> : null}
            {notices[row.key] ? <p className="admin-color-help" role="status">{notices[row.key]}</p> : null}
            {!complete || duplicate ? <p className="admin-color-help">{duplicate ? "Choisissez une référence unique avant d’enregistrer." : "À compléter : couleur, nuance, référence et photo réelle. Le prix peut rester vide."}</p> : null}
            {errors[row.key] ? <p className="admin-validation-message" role="alert">{errors[row.key]}</p> : null}
            {!row.id ? <button type="button" className="admin-danger-link" onClick={() => remove(row.key)}>Retirer cette couleur non enregistrée</button> : <p className="admin-color-help">Les variantes enregistrées sont conservées. Désactivez une couleur pour la masquer.</p>}
          </fieldset>
        </fieldset>;
      })}
    </div>
    {payload.length && !valid ? <p className="admin-validation-message" role="status">Complétez les variantes indiquées avant d’enregistrer le produit.</p> : null}
    <button type="button" className="admin-secondary" onClick={() => add()}><Plus size={16} aria-hidden="true" />Ajouter une couleur personnalisée</button>
    <p className="admin-color-help">Dupliquer prépare une nouvelle variante avec stock à zéro, sans photo ni code-barres. Aucune modification n’est enregistrée avant « Enregistrer ».</p>
  </section>;
}
