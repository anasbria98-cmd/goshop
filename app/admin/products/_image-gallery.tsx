"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ExternalLink, GripVertical, LoaderCircle, Star, Trash2 } from "lucide-react";
import { deleteProductImage, setPrimaryProductImage, setProductImageOrder } from "../actions";

type ImageItem = { id: string; storage_path: string; alt_text: string | null; sort_order: number; is_primary: boolean };

export function ProductImageGallery({ images, productId, productName, publicBase }: { images: ImageItem[]; productId: string; productName: string; publicBase: string }) {
  const [items, setItems] = useState(images);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const urlFor = (path: string) => `${publicBase}/storage/v1/object/public/product-images/${path}`;

  const move = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const from = items.findIndex((item) => item.id === draggedId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next.map((item, index) => ({ ...item, sort_order: index })));
    setDraggedId(null);
    setError("");
    startTransition(async () => {
      try {
        for (const [index, item] of next.entries()) {
          const data = new FormData();
          data.set("product_id", productId);
          data.set("image_id", item.id);
          data.set("sort_order", String(index));
          await setProductImageOrder(data);
        }
      } catch {
        setItems(images);
        setError("Impossible de modifier l’ordre des images. Réessayez.");
      }
    });
  };

  return (
    <>
      <div className="admin-image-gallery-help"><GripVertical size={15} /> Glissez les vignettes pour modifier leur ordre.{pending ? <span><LoaderCircle className="admin-spinner" size={14} /> Enregistrement…</span> : null}</div>
      {error ? <div className="admin-validation-message" role="alert">{error}</div> : null}
      <div className="admin-media-grid admin-product-images">
        {items.map((image) => (
          <article
            key={image.id}
            className={`${image.is_primary ? "is-primary" : ""}${draggedId === image.id ? " is-dragging" : ""}`}
            draggable
            onDragStart={() => setDraggedId(image.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); move(image.id); }}
          >
            <div className="admin-media-preview">
              <Image src={urlFor(image.storage_path)} width={300} height={220} alt={image.alt_text || productName} />
              {image.is_primary ? <span><Star size={13} /> Image principale</span> : null}
              <span className="admin-drag-handle" aria-hidden="true"><GripVertical size={17} /></span>
            </div>
            <strong>{image.alt_text || productName}</strong>
            <div className="admin-row-actions">
              <a href={urlFor(image.storage_path)} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Aperçu</a>
              {!image.is_primary ? <form action={setPrimaryProductImage}><input type="hidden" name="product_id" value={productId} /><input type="hidden" name="image_id" value={image.id} /><button><Star size={14} /> Définir principale</button></form> : null}
              <form action={deleteProductImage}><input type="hidden" name="product_id" value={productId} /><input type="hidden" name="image_id" value={image.id} /><button className="admin-danger-link"><Trash2 size={14} /> Supprimer</button></form>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
