import Image from "next/image";
import { FileImage, Trash2, Upload } from "lucide-react";
import { AdminHeader, EmptyState, PanelHeader, SubmitButton } from "../_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteMedia, uploadMedia } from "../actions";

export default async function MediaPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return (
    <>
      <AdminHeader title="Médias" description="Bibliothèque d’images stockées dans Supabase Storage." />
      <section className="admin-panel"><PanelHeader title="Importer un média" description="Les doublons exacts sont automatiquement évités." /><form action={uploadMedia} className="admin-media-upload"><label><Upload size={24} /><span><strong>Choisir une image</strong><small>PNG, JPG, WebP ou SVG · 8 Mo maximum</small></span><input name="file" type="file" accept="image/*" required /></label><SubmitButton>Importer</SubmitButton></form></section>
      <section className="admin-panel admin-panel--flush"><PanelHeader title="Bibliothèque" count={data?.length ?? 0} />{data?.length ? <div className="admin-media-grid">{data.map((asset) => <article key={String(asset.id)}><div className="admin-media-preview"><Image src={`${base}/storage/v1/object/public/${String(asset.bucket)}/${String(asset.storage_path)}`} width={260} height={190} alt={String(asset.alt_text ?? asset.file_name)} /></div><span><strong>{String(asset.file_name)}</strong><small>{String(asset.mime_type || "Image")} · {Math.round(Number(asset.size_bytes || 0) / 1024)} Ko</small><small>{new Date(String(asset.created_at)).toLocaleDateString("fr-MA")}</small></span><form action={deleteMedia}><input type="hidden" name="id" value={String(asset.id)} /><SubmitButton className="admin-link-button admin-danger-link"><Trash2 size={14} /> Supprimer</SubmitButton></form></article>)}</div> : <EmptyState title="Bibliothèque vide"><FileImage size={18} /> Importez votre première image.</EmptyState>}</section>
    </>
  );
}
