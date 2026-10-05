"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Heart, Truck, ShieldCheck } from "lucide-react";
import { type Product, categories, money } from "@/data/catalog";
import { Quantity } from "./product-card";
import { useStore } from "./store-provider";
export function ProductDetail({ product: p }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const { add, favorites, toggleFavorite } = useStore();
  const cat = categories.find((c) => c.slug === p.category)!;
  return (
    <div className="wrap detail-page">
      <div className="breadcrumbs">
        <Link href="/">Accueil</Link>
        <span>/</span>
        <Link href={`/categorie/${cat.slug}`}>{cat.name}</Link>
        <span>/</span>
        {p.name}
      </div>
      <div className="detail-grid">
        <div className="detail-image">
          <Image
            src={`/products/${p.image}.webp`}
            width={550}
            height={500}
            alt={p.name}
            priority
          />
          <small>Visuel indicatif — référence à confirmer</small>
        </div>
        <div className="detail-info">
          <span className="product-brand">{p.brand}</span>
          <h1>{p.name}</h1>
          <p className="reference">
            Réf. GO ELEC : {p.id} · Réf. fabricant : {p.manufacturerRef}
          </p>
          <div className={`stock ${!p.stock ? "unavailable" : ""}`}>
            {p.stock ? "En stock" : "Indisponible"}
          </div>
          <div className="price-line">
            <strong>{money(p.price)}</strong>
            {p.oldPrice && <del>{money(p.oldPrice)}</del>}
          </div>
          <p className="tax">TTC / unité</p>
          <div className="detail-purchase">
            <Quantity value={qty} onChange={setQty} max={p.stock} />
            <button
              className="button orange"
              disabled={!p.stock}
              onClick={() => add(p.id, qty)}
            >
              <ShoppingCart size={18} /> Ajouter au panier
            </button>
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
            {favorites.includes(p.id)
              ? "Retirer des favoris"
              : "Ajouter à mes favoris"}
          </button>
          <div className="detail-reassurance">
            <span>
              <Truck size={20} /> Livraison partout au Maroc
            </span>
            <span>
              <ShieldCheck size={20} /> Une sélection pour vos projets
              électriques
            </span>
          </div>
          <p className="mock-notice">
            Produit de démonstration. Prix, stock, avis et caractéristiques
            indicatifs. La fiche technique fabricant sera ajoutée avant
            commercialisation.
          </p>
        </div>
      </div>
    </div>
  );
}
