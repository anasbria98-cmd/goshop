"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { uploadProductImage } from "../actions";
import { SubmitButton } from "../_submit-button";

export function ProductImageUpload({ productId }: { productId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  return (
    <form action={uploadProductImage} className="admin-upload-card">
      <input type="hidden" name="product_id" value={productId} />
      <label
        className="admin-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!inputRef.current) return;
          inputRef.current.files = event.dataTransfer.files;
          setNames(Array.from(event.dataTransfer.files).map((file) => file.name));
        }}
      >
        <ImagePlus aria-hidden="true" size={28} />
        <strong>Glissez vos images ici</strong>
        <span>ou cliquez pour parcourir · PNG, JPG, WebP · 8 Mo maximum</span>
        <input ref={inputRef} name="files" type="file" accept="image/*" multiple required onChange={(event) => setNames(Array.from(event.target.files ?? []).map((file) => file.name))} />
      </label>
      {names.length ? <p className="admin-file-selection">{names.length} fichier(s) sélectionné(s) : {names.join(", ")}</p> : null}
      <label>Texte alternatif<input name="alt_text" placeholder="Description utile de l’image" /></label>
      <SubmitButton>Importer les images</SubmitButton>
    </form>
  );
}
