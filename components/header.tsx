"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Heart,
  ShoppingCart,
  UserRound,
  Menu,
  X,
  ChevronDown,
  Truck,
  ShieldCheck,
  Headphones,
  RotateCcw,
  ChevronRight,
  Zap,
} from "lucide-react";
import { categories, money } from "@/data/catalog";
import { useStore } from "./store-provider";
export function Header() {
  const { count, total, favorites } = useStore();
  const [active, setActive] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    function close(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActive(null);
        setMobile(false);
      }
    }
    function outside(e: PointerEvent) {
      if (nav.current && !nav.current.contains(e.target as Node))
        setActive(null);
    }
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  useEffect(() => {
    if (mobile) {
      drawer.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      drawer.current?.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobile]);
  return (
    <>
      <div className="topbar">
        <div className="wrap topbar-inner">
          <span>
            <Truck size={14} /> Livraison partout au Maroc
          </span>
          <div>
            <span>
              <ShieldCheck size={14} /> Paiement sécurisé
            </span>
            <Link href="/informations/service-client">
              <Headphones size={14} /> Service client
            </Link>
            <Link href="/informations/retours">
              <RotateCcw size={14} /> Retours
            </Link>
            <span className="country">🇲🇦 &nbsp; Maroc · Français</span>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="wrap main-header">
          <button
            className="mobile-menu icon-button"
            ref={toggle}
            aria-label="Ouvrir les catégories"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <Link href="/" className="logo" aria-label="Goshop.ma — accueil">
            go<span>shop</span>
            <small>.ma</small>
            <i />
          </Link>
          <form action="/recherche" role="search" className="search">
            <input
              name="q"
              aria-label="Rechercher un produit"
              placeholder="Rechercher un produit, une marque, une catégorie, une réf."
            />
            <button aria-label="Rechercher">
              <Search size={22} />
            </button>
          </form>
          <div className="header-actions">
            <Link href="/compte" className="header-action account">
              <UserRound size={25} />
              <span>
                Bienvenue<strong>Mon compte</strong>
              </span>
            </Link>
            <Link
              href="/favoris"
              className="header-action favorite-link"
              aria-label={`Mes favoris (${favorites.length})`}
            >
              <Heart size={25} />
              {favorites.length > 0 && (
                <b className="count">{favorites.length}</b>
              )}
            </Link>
            <Link
              href="/panier"
              className="header-action cart-link"
              aria-label={`Mon panier, ${count} article${count !== 1 ? "s" : ""}, ${money(total)}`}
            >
              <div className="cart-icon">
                <ShoppingCart size={26} />
                <b className="count">{count}</b>
              </div>
              <span>
                Mon panier<strong>{money(total)}</strong>
              </span>
            </Link>
          </div>
        </div>
        <nav
          className="desktop-nav"
          ref={nav}
          aria-label="Catégories de produits"
        >
          <div className="wrap nav-row">
            <button
              className={`all-categories ${active === "all" ? "active" : ""}`}
              aria-expanded={active === "all"}
              onClick={() => setActive(active === "all" ? null : "all")}
            >
              <Menu size={18} /> Toutes les catégories
              <ChevronDown size={14} />
            </button>
            {categories.slice(0, 6).map((c) => (
              <button
                key={c.slug}
                aria-expanded={active === c.slug}
                onClick={() => setActive(active === c.slug ? null : c.slug)}
                className={active === c.slug ? "active" : ""}
              >
                {c.name}
              </button>
            ))}
            <Link href="/recherche?promo=1" className="nav-promo">
              <Zap size={15} /> Bons plans
            </Link>
          </div>
          {active && (
            <div className="mega-menu wrap">
              <div className="mega-sidebar">
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    className={active === c.slug ? "active" : ""}
                    onClick={() => setActive(c.slug)}
                  >
                    {c.name}
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <div className="mega-content">
                <div className="mega-heading">
                  <h2>
                    {active === "all"
                      ? "Tous nos univers"
                      : categories.find((c) => c.slug === active)?.name}
                  </h2>
                  <button
                    aria-label="Fermer le menu"
                    onClick={() => setActive(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="mega-links">
                  {(active === "all"
                    ? categories.map((c) => ({ name: c.name, slug: c.slug }))
                    : categories
                        .find((c) => c.slug === active)!
                        .subcategories.map((name) => ({ name, slug: active }))
                  ).map((c) => (
                    <Link
                      key={c.name}
                      href={`/categorie/${c.slug}`}
                      onClick={() => setActive(null)}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
                <Link
                  href={
                    active === "all" ? "/recherche" : `/categorie/${active}`
                  }
                  className="text-link"
                  onClick={() => setActive(null)}
                >
                  Voir tous les produits
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>
      <dialog
        ref={drawer}
        className="mobile-drawer"
        aria-label="Navigation mobile"
        onCancel={() => setMobile(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMobile(false);
        }}
      >
        <div className="drawer-heading">
          <strong>Nos catégories</strong>
          <button
            aria-label="Fermer les catégories"
            onClick={() => {
              setMobile(false);
              toggle.current?.focus();
            }}
          >
            <X />
          </button>
        </div>
        <div className="mobile-category-list">
          {categories.map((c) => (
            <details key={c.slug}>
              <summary>
                {c.name}
                <ChevronDown size={16} />
              </summary>
              <Link
                href={`/categorie/${c.slug}`}
                onClick={() => setMobile(false)}
              >
                Tout voir
              </Link>
              {c.subcategories.map((s) => (
                <Link
                  href={`/categorie/${c.slug}`}
                  key={s}
                  onClick={() => setMobile(false)}
                >
                  {s}
                </Link>
              ))}
            </details>
          ))}
        </div>
        <Link href="/compte" onClick={() => setMobile(false)}>
          Mon compte
        </Link>
        <Link href="/favoris" onClick={() => setMobile(false)}>
          Mes favoris ({favorites.length})
        </Link>
      </dialog>
    </>
  );
}
