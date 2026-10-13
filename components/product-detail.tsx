"use client";
import { StoreText, useStorefrontLanguage } from "@/components/storefront-language";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Heart, Truck, ShieldCheck } from "lucide-react";
import { type CatalogProduct, money } from "@/lib/catalog-model";
import { Quantity } from "./product-card";
import { useStore } from "./store-provider";
export function ProductDetail({ product: p }: { product: CatalogProduct }) {
  const { t } = useStorefrontLanguage();
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(p.imageUrl);
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
            alt={p.name}
            priority
          /> : <span className="product-image-placeholder detail-placeholder" />}
          {p.images.length > 1 ? <div className="detail-thumbnails">{p.images.map((image) => <button type="button" className={selectedImage === image.url ? "active" : ""} onClick={() => setSelectedImage(image.url)} key={image.url} aria-label={`${t("Afficher")} ${image.alt}`}><Image src={image.url} width={72} height={72} alt="" /></button>)}</div> : null}
        </div>
        <div className="detail-info">
          <span className="product-brand"><bdi>{p.brand}</bdi></span>
          <h1><bdi>{p.name}</bdi></h1>
          <p className="reference"><StoreText>
            Réf. GO ELEC : </StoreText><bdi>{p.sku}</bdi><StoreText> · Réf. fabricant : </StoreText><bdi>{p.manufacturerReference || "—"}</bdi>
          </p>
          <div className={`stock ${!p.stock ? "unavailable" : ""}`}>
            <StoreText>{p.stock || p.allowBackorder ? "En stock" : "Indisponible"}</StoreText>
          </div>
          <div className="price-line">
            <strong>{money(p.price)}</strong>
            {p.compareAtPrice && <del>{money(p.compareAtPrice)}</del>}
          </div>
          <p className="tax"><StoreText>TTC / unité</StoreText></p>
          <div className="detail-purchase">
            <Quantity value={qty} onChange={setQty} max={p.allowBackorder ? 999 : p.stock} />
            <button
              className="button orange"
              disabled={!p.stock && !p.allowBackorder}
              onClick={() => add(p, qty)}
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
