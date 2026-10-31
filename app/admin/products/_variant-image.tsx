"use client";
import Image from "next/image";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { variantImageUrl, type VariantGalleryImage } from "@/lib/variant-image";

export function VariantImage({ value, onChange, gallery = [], onBusy, label = "Image de la variante" }: {
  value: string; onChange: (path: string) => void; gallery?: VariantGalleryImage[];
  onBusy?: (busy: boolean) => void; label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[file.type];
    if (!ext || file.size > 8 * 1024 * 1024) { setError("Choisissez une image PNG, JPEG ou WebP de 8 Mo maximum."); return; }
    setBusy(true); onBusy?.(true); setError("");
    try {
      const path = `variants/${crypto.randomUUID()}.${ext}`;
      const { error } = await createSupabaseBrowserClient().storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      onChange(path);
    } catch { setError("L’import de l’image a échoué. Réessayez avant d’enregistrer."); }
    finally { setBusy(false); onBusy?.(false); }
  }
  return <div>
    {value ? <Image src={variantImageUrl(value)} alt={label} width={72} height={72} style={{objectFit:"contain"}} /> : null}
    <label>{label}<select value={gallery.some(i => i.storage_path === value) ? value : value ? "__uploaded" : ""} disabled={busy} onChange={e => onChange(e.target.value)}>
      <option value="">Image principale du produit (par défaut)</option>
      {value && !gallery.some(i => i.storage_path === value) ? <option value="__uploaded" disabled>Image importée</option> : null}
      {gallery.map((image, i) => <option key={image.storage_path} value={image.storage_path}>{image.alt_text || `Image produit ${i + 1}`}</option>)}
    </select></label>
    <label>Importer une image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
    {busy ? <p role="status">Import en cours…</p> : null}
    {error ? <p role="alert" className="admin-validation-message">{error}</p> : null}
  </div>;
}
