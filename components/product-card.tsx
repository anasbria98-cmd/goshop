"use client";
import { StoreText, useStorefrontLanguage } from "@/components/storefront-language";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { type CatalogProduct, money } from "@/lib/catalog-model";
import { useStore } from "./store-provider";
import colorStyles from "./product-card-colors.module.css";
export function Quantity({
  value,
  onChange,
  max = 999,
  label = "Quantité",
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  label?: string;
}) {
  const { t } = useStorefrontLanguage();
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label={`${t("Diminuer")} ${t(label)}`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={13} />
      </button>
      <span aria-label={t(label)}>{value}</span>
      <button
        type="button"
        aria-label={`${t("Augmenter")} ${t(label)}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
export function ProductCard({ product: p }: { product: CatalogProduct }) {
  const router = useRouter();
  const colors = p.colors ?? p.variants?.map(v=>({name:v.colorName,hex:v.colorHex}));
  const { t } = useStorefrontLanguage();
  const [qty, setQty] = useState(1);
  const { add, favorites, toggleFavorite } = useStore();
  return (
    <article className="product-card">
      <div className="product-top">
        {p.compareAtPrice ? (
          <span className="discount">
            -{Math.round((1 - p.price / p.compareAtPrice) * 100)}%
          </span>
        ) : p.isNew ? (
          <span className="new-badge"><StoreText>Nouveau</StoreText></span>
        ) : (
          <span />
        )}
        <button
          className={`favorite ${favorites.includes(p.id) ? "selected" : ""}`}
          aria-label={`${t(favorites.includes(p.id) ? "Retirer des favoris" : "Ajouter à mes favoris")} — ${p.name}`}
          aria-pressed={favorites.includes(p.id)}
          onClick={() => toggleFavorite(p.id)}
        >
          <Heart size={19} />
        </button>
      </div>
      <Link href={`/produit/${p.slug}`} className="product-image">
        {p.imageUrl ? <Image
          src={p.imageUrl}
          width={220}
          height={180}
          alt={p.name}
          sizes="(max-width: 600px) 45vw, 220px"
        /> : <span className="product-image-placeholder" aria-hidden="true" />}
      </Link>
      <div
        className={`product-brand brand-${p.brand.split(" ")[0].toLowerCase()}`}
      >
        <bdi>{p.brand}</bdi>
      </div>
      <Link href={`/produit/${p.slug}`} className="product-title">
        <bdi>{p.name}</bdi>
      </Link>
      <div className="rating">
        <span aria-label={`${p.rating} ${t("sur 5")}`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={12} fill={i < Math.round(p.rating) ? "currentColor" : "none"} />
          ))}
        </span>
        <small>({p.reviewCount})</small>
      </div>
      {Boolean(colors?.length) && <div className={colorStyles.swatches} role="list" aria-label={t("Couleur")}>
        {colors?.map((color,index) => <span key={index} role="listitem" className={colorStyles.swatch} title={color.name} aria-label={color.name}>
          <span aria-hidden="true" style={{backgroundColor:color.hex}} />
        </span>)}
      </div>}
      <p className="reference"><StoreText>
        Réf. GO ELEC : </StoreText><bdi>{p.sku}</bdi>
        <br /><StoreText>
        Réf. fabricant : </StoreText><bdi>{p.manufacturerReference || "—"}</bdi>
      </p>
      <div className={`stock ${!p.stock ? "unavailable" : ""}`}>
        <StoreText>{p.stock || p.allowBackorder ? "En stock" : "Indisponible"}</StoreText>
      </div>
      <div className="price-line">
        <strong>{money(p.price)}</strong>
        {p.compareAtPrice && <del>{money(p.compareAtPrice)}</del>}
      </div>
      <small className="tax"><StoreText>TTC / unité</StoreText></small>
      <div className="purchase">
        <Quantity value={qty} onChange={setQty} max={p.allowBackorder ? 999 : p.stock} label={p.sku} />
        <button
          className="add-button"
          disabled={(p.hasColorVariants && !p.variants?.length) || (!p.stock && !p.allowBackorder)}
          onClick={() => p.hasColorVariants ? router.push(`/produit/${p.slug}`) : add(p, qty)}
          aria-label={`${t("Ajouter au panier")} — ${p.name}`}
        >
          <ShoppingCart size={16} />
          <span><StoreText>{p.hasColorVariants ? "Choisir" : "Ajouter"}</StoreText></span>
        </button>
      </div>
    </article>
  );
}
