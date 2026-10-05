"use client";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingCart, ShieldCheck } from "lucide-react";
import { useStore } from "./store-provider";
import { products, money } from "@/data/catalog";
import { Quantity } from "./product-card";
export function CartView() {
  const { cart, count, total, setQuantity } = useStore();
  const items = products.filter((p) => cart[p.id]);
  return (
    <div className="wrap cart-page">
      <div className="breadcrumbs">
        <Link href="/">Accueil</Link>
        <span>/</span>Mon panier
      </div>
      <h1>
        Mon panier{" "}
        <span>
          ({count} article{count !== 1 ? "s" : ""})
        </span>
      </h1>
      {!items.length ? (
        <div className="empty-state">
          <ShoppingCart size={46} />
          <h2>Votre panier attend vos projets</h2>
          <p>Découvrez nos équipements et ajoutez votre première sélection.</p>
          <Link href="/recherche" className="button orange">
            Découvrir les produits
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {items.map((p) => (
              <article className="cart-item" key={p.id}>
                <Link href={`/produit/${p.slug}`}>
                  <Image
                    src={`/products/${p.image}.webp`}
                    width={110}
                    height={110}
                    alt={p.name}
                  />
                </Link>
                <div>
                  <span className="product-brand">{p.brand}</span>
                  <Link href={`/produit/${p.slug}`}>
                    <h2>{p.name}</h2>
                  </Link>
                  <p className="reference">
                    Réf. {p.id} · {money(p.price)} / unité
                  </p>
                  <Quantity
                    value={cart[p.id]}
                    onChange={(n) => setQuantity(p.id, n)}
                    max={p.stock}
                    label={p.id}
                  />
                </div>
                <div className="cart-item-total">
                  <strong>{money(p.price * cart[p.id])}</strong>
                  <button
                    aria-label={`Supprimer ${p.name}`}
                    onClick={() => setQuantity(p.id, 0)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
            <Link className="continue-shopping" href="/recherche">
              Continuer mes achats
            </Link>
          </div>
          <aside className="cart-summary">
            <h2>Récapitulatif</h2>
            <div>
              <span>Sous-total TTC</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Livraison</span>
              <span>À confirmer</span>
            </div>
            <div className="cart-grand-total">
              <strong>Total produits</strong>
              <strong>{money(total)}</strong>
            </div>
            <Link className="button orange" href="/checkout">
              Préparer ma commande
            </Link>
            <p>
              <ShieldCheck size={16} /> Aucune transaction en mode
              démonstration.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
