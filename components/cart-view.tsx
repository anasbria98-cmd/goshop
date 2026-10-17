"use client";
import { StoreText, useStorefrontLanguage } from "@/components/storefront-language";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingCart, ShieldCheck } from "lucide-react";
import { useStore } from "./store-provider";
import { money } from "@/lib/catalog-model";
import { Quantity } from "./product-card";
import { cartLineKey } from "@/lib/product-variants";
export function CartView() {
  const { t, locale } = useStorefrontLanguage();
  const { cart, count, total, setQuantity, clearCart } = useStore();
  const items = Object.values(cart);
  return (
    <div className="wrap cart-page">
      <div className="breadcrumbs">
        <Link href="/"><StoreText>Accueil</StoreText></Link>
        <span>/</span><StoreText>Mon panier
      </StoreText></div>
      <h1><StoreText>
        Mon panier</StoreText>{" "}
        <span>
          ({count} {locale === "ar" ? "منتج" : `article${count !== 1 ? "s" : ""}`})
        </span>
      </h1>
      {!items.length ? (
        <div className="empty-state">
          <ShoppingCart size={46} />
          <h2><StoreText>Votre panier attend vos projets</StoreText></h2>
          <p><StoreText>Découvrez nos équipements et ajoutez votre première sélection.</StoreText></p>
          <Link href="/recherche" className="button orange"><StoreText>
            Découvrir les produits
          </StoreText></Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {items.map(({ product: p, quantity }) => (
              <article className="cart-item" key={cartLineKey(p)}>
                <Link href={`/produit/${p.slug}`}>
                  {p.imageUrl ? <Image
                    src={p.imageUrl}
                    width={110}
                    height={110}
                    alt={p.name}
                  /> : <span className="product-image-placeholder" />}
                </Link>
                <div>
                  <span className="product-brand"><bdi>{p.brand}</bdi></span>
                  <Link href={`/produit/${p.slug}`}>
                    <h2><bdi>{p.name}</bdi></h2>
                  </Link>
                  {p.selectedVariant ? <p className="reference">{p.selectedVariant.colorName}{p.selectedVariant.finish ? ` · ${p.selectedVariant.finish}` : ""}</p> : null}
                  <p className="reference"><StoreText>
                    Réf. </StoreText><bdi>{p.sku}</bdi> · {money(p.price)}<StoreText> / unité
                  </StoreText></p>
                  <Quantity
                    value={quantity}
                    onChange={(n) => setQuantity(cartLineKey(p), n)}
                    max={p.allowBackorder ? 999 : p.stock}
                    label={p.sku}
                  />
                </div>
                <div className="cart-item-total">
                  <strong>{money(p.price * quantity)}</strong>
                  <button
                    aria-label={`${t("Supprimer")} ${p.name}`}
                    onClick={() => setQuantity(cartLineKey(p), 0)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
            <Link className="continue-shopping" href="/recherche"><StoreText>
              Continuer mes achats
            </StoreText></Link>
          </div>
          <aside className="cart-summary">
            <h2><StoreText>Récapitulatif</StoreText></h2>
            <div>
              <span><StoreText>Sous-total TTC</StoreText></span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span><StoreText>Livraison</StoreText></span>
              <span><StoreText>À confirmer</StoreText></span>
            </div>
            <div className="cart-grand-total">
              <strong><StoreText>Total produits</StoreText></strong>
              <strong>{money(total)}</strong>
            </div>
            <Link className="button orange" href="/checkout"><StoreText>
              Préparer ma commande
            </StoreText></Link>
            <button type="button" className="continue-shopping" onClick={clearCart}><Trash2 size={16} aria-hidden="true" /><StoreText>Vider le panier</StoreText></button>
            <p>
              <ShieldCheck size={16} /><StoreText> Vos prix et disponibilités seront
              vérifiés avant validation.
            </StoreText></p>
          </aside>
        </div>
      )}
    </div>
  );
}
