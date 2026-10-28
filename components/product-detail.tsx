"use client";
import { StoreText, useStorefrontLanguage } from "@/components/storefront-language";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Heart, Truck, ShieldCheck } from "lucide-react";
import { type CatalogProduct, money } from "@/lib/catalog-model";
import { Quantity } from "./product-card";
import { useStore } from "./store-provider";
import "./product-variants.css";
import { ProductShare } from "./product-page-extras";
import { initialProductVariant, selectProductVariant } from "@/lib/product-variants";
export function ProductDetail({ product: p }: { product: CatalogProduct }) {
  const { t } = useStorefrontLanguage();
  const [qty, setQty] = useState(1);
  const initialVariant = initialProductVariant(p);
  const [selectedVariant, setSelectedVariant] = useState(initialVariant);
  const [selectedImage, setSelectedImage] = useState(initialVariant?.imageUrl ?? p.imageUrl);
  const selected = selectedVariant ? selectProductVariant(p, selectedVariant) : p;
  const unavailable = Boolean((p.hasColorVariants || p.hasGeneralVariants) && !selectedVariant) || (!selected.stock && !p.allowBackorder);
  const { add, favorites, toggleFavorite } = useStore();
  const cat = p.category;
  return (
    <div className="wrap detail-page">
      <div className="breadcrumbs">
        <Link href="/"><StoreText>Accueil</StoreText></Link>
        <span>/</span>
        {cat && <><Link href={`/categorie/${cat.path}`}><StoreText>{cat.name}</StoreText></Link><span>/</span></>}
        <bdi>{p.name}</bdi>
      </div>
      <div className="detail-grid">
        <div className="detail-image">
          {selectedImage ? <Image
            src={selectedImage}
            width={550}
            height={500}
            alt={`${p.name}${selectedVariant ? ` — ${selectedVariant.colorName || selectedVariant.name}` : ""}`}
            priority
            key={p.hasColorVariants ? selectedImage : undefined}
            className={p.hasColorVariants ? "variant-product-image" : undefined}
          /> : <span className="product-image-placeholder detail-placeholder" />}
          {p.images.length > 1 ? <div className="detail-thumbnails">{p.images.map((image) => <button type="button" className={selectedImage === image.url ? "active" : ""} onClick={() => setSelectedImage(image.url)} key={image.url} aria-label={`${t("Afficher")} ${image.alt}`}><Image src={image.url} width={72} height={72} alt="" /></button>)}</div> : null}
        </div>
        <div className="detail-info">
          <span className="product-brand"><bdi>{p.brand}</bdi></span>
          <h1><bdi>{p.name}</bdi></h1>
          <p className="reference"><StoreText>
            Réf. GO ELEC : </StoreText><bdi>{selected.sku}</bdi><StoreText> · Réf. fabricant : </StoreText><bdi>{p.manufacturerReference || "—"}</bdi>
          </p>
          {p.hasColorVariants ? <fieldset className="product-color-selection">
            <legend><StoreText>Couleur</StoreText>{selectedVariant ? ` : ${selectedVariant.colorName}${selectedVariant.finish ? ` · ${selectedVariant.finish}` : ""}` : ""}</legend>
            <div className="product-color-swatches">{p.variants?.map((variant) => <button type="button" key={variant.id} aria-pressed={selectedVariant?.id === variant.id} aria-label={`${variant.colorName}${variant.finish ? ` · ${variant.finish}` : ""}`} title={`${variant.colorName}${variant.finish ? ` · ${variant.finish}` : ""}`} onClick={() => { setSelectedVariant(variant); setSelectedImage(variant.imageUrl); setQty(1); }}>
              <span aria-hidden="true" style={{ backgroundColor: variant.colorHex }} /><span>{variant.colorName}{variant.finish ? ` · ${variant.finish}` : ""}</span>
            </button>)}</div>
          </fieldset> : null}
          {p.hasGeneralVariants ? <fieldset className="product-color-selection">
            <legend><StoreText>Variante</StoreText>{selectedVariant ? ` : ${selectedVariant.name}` : ""}</legend>
            <div className="product-color-swatches">{p.variants?.map(variant => <button type="button" key={variant.id}
              aria-pressed={selectedVariant?.id === variant.id}
              onClick={() => { setSelectedVariant(variant); setSelectedImage(variant.imageUrl || p.imageUrl); setQty(1); }}>
              {variant.name}
            </button>)}</div>
          </fieldset> : null}
          <div className={`stock ${((p.hasColorVariants || p.hasGeneralVariants) ? unavailable : !p.stock) ? "unavailable" : ""}`} aria-live={p.hasColorVariants || p.hasGeneralVariants ? "polite" : undefined}>
            <StoreText>{unavailable ? "Indisponible" : "En stock"}</StoreText>
          </div>
          <div className="price-line">
            <strong>{money(selected.price)}</strong>
            {selected.compareAtPrice && <del>{money(selected.compareAtPrice)}</del>}
          </div>
          <p className="tax"><StoreText>TTC / unité</StoreText></p>
          <div className="detail-purchase">
            <Quantity value={qty} onChange={setQty} max={p.allowBackorder ? 999 : selected.stock} />
            <button
              className="button orange"
              disabled={unavailable}
              onClick={() => add(selected, qty)}
            >
              <ShoppingCart size={18} /><StoreText> Ajouter au panier
            </StoreText></button>
          </div>
          <button
            className="detail-favorite"
            aria-pressed={favorites.includes(p.id)}
            onClick={() => toggleFavorite(p.id)}
          >
            <Heart
              size={18}
              fill={favorites.includes(p.id) ? "currentColor" : "none"}
            />
            <StoreText>{favorites.includes(p.id)
              ? "Retirer des favoris"
              : "Ajouter à mes favoris"}</StoreText>
          </button>
          <div className="detail-reassurance">
            <span>
              <Truck size={20} /><StoreText> Livraison partout au Maroc
            </StoreText></span>
            <span>
              <ShieldCheck size={20} /><StoreText> Une sélection pour vos projets
              électriques
            </StoreText></span>
          </div>
          <ProductShare name={p.name} />
          {p.shortDescription && <p>{p.shortDescription}</p>}
          {p.attributes.length > 0 && <dl className="product-attributes">
            {p.attributes.map((attribute) => <div key={attribute.slug}><dt><StoreText>{attribute.name}</StoreText></dt><dd>{attribute.value}{attribute.unit ? ` ${attribute.unit}` : ""}</dd></div>)}
          </dl>}
        </div>
      </div>
      {p.description && <section className="product-full-description"><h2><StoreText>Description</StoreText></h2><p>{p.description}</p></section>}
    </div>
  );
}
