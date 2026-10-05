"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { type Product, money } from "@/data/catalog";
import { useStore } from "./store-provider";
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
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label={`Diminuer ${label}`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={13} />
      </button>
      <span aria-label={label}>{value}</span>
      <button
        type="button"
        aria-label={`Augmenter ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
export function ProductCard({ product: p }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const { add, favorites, toggleFavorite } = useStore();
  return (
    <article className="product-card">
      <div className="product-top">
        {p.oldPrice ? (
          <span className="discount">
            -{Math.round((1 - p.price / p.oldPrice) * 100)}%
          </span>
        ) : p.fresh ? (
          <span className="new-badge">Nouveau</span>
        ) : (
          <span />
        )}
        <button
          className={`favorite ${favorites.includes(p.id) ? "selected" : ""}`}
          aria-label={`${favorites.includes(p.id) ? "Retirer" : "Ajouter"} ${p.name} ${favorites.includes(p.id) ? "des" : "aux"} favoris`}
          aria-pressed={favorites.includes(p.id)}
          onClick={() => toggleFavorite(p.id)}
        >
          <Heart size={19} />
        </button>
      </div>
      <Link href={`/produit/${p.slug}`} className="product-image">
        <Image
          src={`/products/${p.image}.webp`}
          width={220}
          height={180}
          alt={p.name}
          sizes="(max-width: 600px) 45vw, 220px"
        />
      </Link>
      <div
        className={`product-brand brand-${p.brand.split(" ")[0].toLowerCase()}`}
      >
        {p.brand}
      </div>
      <Link href={`/produit/${p.slug}`} className="product-title">
        {p.name}
      </Link>
      <div className="rating">
        <span aria-label={`${p.rating} sur 5`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={12} fill="currentColor" />
          ))}
        </span>
        <small>({p.reviews})</small>
      </div>
      <p className="reference">
        Réf. Goshop : {p.id}
        <br />
        Réf. fabricant : {p.manufacturerRef}
      </p>
      <div className={`stock ${!p.stock ? "unavailable" : ""}`}>
        {p.stock ? "En stock" : "Indisponible"}
      </div>
      <div className="price-line">
        <strong>{money(p.price)}</strong>
        {p.oldPrice && <del>{money(p.oldPrice)}</del>}
      </div>
      <small className="tax">TTC / unité</small>
      <div className="purchase">
        <Quantity value={qty} onChange={setQty} max={p.stock} label={p.id} />
        <button
          className="add-button"
          disabled={!p.stock}
          onClick={() => add(p.id, qty)}
          aria-label={`Ajouter ${p.name} au panier`}
        >
          <ShoppingCart size={16} />
          <span>Ajouter</span>
        </button>
      </div>
    </article>
  );
}
