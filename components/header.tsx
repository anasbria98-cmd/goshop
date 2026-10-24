"use client";
import { StoreText, LanguageSwitcher, useStorefrontLanguage } from "@/components/storefront-language";
import Link from "next/link";
import utilityStyles from "./utility-items.module.css";
import { UtilityReturnIcon } from "./utility-return-icon";
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
  ChevronRight,
  Star,
  Zap,
} from "lucide-react";
import { money } from "@/lib/catalog-model";
import { categoryMenuColumns, type CategoryNavigation, type CategoryMenuNode } from "@/lib/category-navigation";
import { useStore } from "./store-provider";
import { BrandLogo } from "./brand-logo";
import { NavigationFeedback } from "./navigation-feedback";
import { MobileCategoryMenu } from "./mobile-category-menu";

function SubmenuLinks({ items, onNavigate, mobile = false }: {
  items: CategoryMenuNode[];
  onNavigate: () => void;
  mobile?: boolean;
}) {
  return items.map((item) => item.children?.length ? (
    <div key={item.href}>
      <Link href={item.href} onClick={onNavigate}><StoreText>{item.name}</StoreText></Link>
      <div className={`${mobile ? "mobile-children" : "mega-children"} garden-applique-children`}>
        <SubmenuLinks items={item.children} onNavigate={onNavigate} mobile={mobile} />
      </div>
    </div>
  ) : (
    <Link key={item.href} href={item.href} onClick={onNavigate}>
      <StoreText>{item.name}</StoreText>
    </Link>
  ));
}

export function Header({navigation}:{navigation:CategoryNavigation}) {
  const { t } = useStorefrontLanguage();
  const { count, total, favorites } = useStore();
  const [active, setActive] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [menuScope,setMenuScope] = useState<"top"|"all">("all");
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const navigationCategories = navigation.all;
  const activeCategory = (menuScope==="top" ? navigation.top : navigationCategories).find(c=>c.id===active);
  const columns = categoryMenuColumns(activeCategory?.children??[]);
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
          <span className={utilityStyles.item}>
            <Truck className={utilityStyles.truck} size={15} strokeWidth={1.75} aria-hidden="true" /><StoreText> Livraison partout au Maroc
          </StoreText></span>
          <div>
            <span className={utilityStyles.item}>
              <ShieldCheck className={utilityStyles.payment} size={15} strokeWidth={1.75} aria-hidden="true" /><StoreText> Paiement sécurisé
            </StoreText></span>
            <Link href="/informations/service-client" className={utilityStyles.item}>
              <Headphones className={utilityStyles.support} size={15} strokeWidth={1.75} aria-hidden="true" /><StoreText> Service client
            </StoreText></Link>
            <Link href="/informations/retours" className={utilityStyles.item}>
              <UtilityReturnIcon className={utilityStyles.returns} /><StoreText> Retours
            </StoreText></Link>
            <LanguageSwitcher />
            <span className="google-rating" dir="ltr" aria-label="Google : 4,3/5">
              <Star size={15} fill="currentColor" aria-hidden="true" />
              <span>4,3/5</span>
            </span>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="wrap main-header">
          <button
            className="mobile-menu icon-button"
            ref={toggle}
            aria-label={t("Ouvrir les catégories")}
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <BrandLogo />
          <form action="/recherche" role="search" className="search">
            <input
              name="q"
              aria-label={t("Rechercher un produit")}
              placeholder={t("Rechercher un produit, une marque, une catégorie, une réf.")}
            />
            <button aria-label={t("Rechercher")}>
              <Search size={22} />
            </button>
          </form>
          <div className="header-actions">
            <Link href="/compte" prefetch={true} className="header-action account navigation-link">
              <UserRound size={25} />
              <span><StoreText>
                Bienvenue</StoreText><strong><StoreText>Mon compte</StoreText></strong>
              </span>
              <NavigationFeedback />
            </Link>
            <Link
              href="/favoris"
              className="header-action favorite-link"
              aria-label={`${t("Mes favoris")} (${favorites.length})`}
            >
              <Heart size={25} />
              {favorites.length > 0 && (
                <b className="count">{favorites.length}</b>
              )}
            </Link>
            <Link
              href="/panier"
              className="header-action cart-link"
              aria-label={`${t("Mon panier")}, ${count} ${t(count !== 1 ? "articles" : "article")}, ${money(total)}`}
            >
              <div className="cart-icon">
                <ShoppingCart size={26} />
                <b className="count">{count}</b>
              </div>
              <span><StoreText>
                Mon panier</StoreText><strong>{money(total)}</strong>
              </span>
            </Link>
          </div>
        </div>
        <nav
          className="desktop-nav"
          ref={nav}
          aria-label={t("Catégories de produits")}
          onMouseLeave={() => setActive(null)}
        >
          <div className="wrap nav-row">
            <button
              className={`all-categories ${active === "all" ? "active" : ""}`}
              aria-expanded={active === "all"}
              onClick={() => {setMenuScope("all");setActive(active === "all" ? null : "all");}}
              onMouseEnter={() => {setMenuScope("all");setActive("all");}}
            >
              <Menu size={18} /><StoreText> Toutes les catégories
              </StoreText><ChevronDown size={14} />
            </button>
            {navigation.top.map((c) => c.children.length ? (
                <button
                  key={c.id}
                  aria-expanded={active === c.id}
                  onClick={() => {setMenuScope("top");setActive(active === c.id ? null : c.id);}}
                  onMouseEnter={() => {setMenuScope("top");setActive(c.id);}}
                  className={active === c.id ? "active" : ""}
                >
                  <StoreText>{c.label}</StoreText>
                </button>
              ) : <Link key={c.id} href={c.href} className={c.icon==='zap' ? 'nav-promo' : undefined} onMouseEnter={()=>setActive(null)} onClick={()=>setActive(null)}>{c.icon==='zap' && <Zap size={15} aria-hidden="true"/>}<StoreText>{c.label}</StoreText></Link>)}
          </div>
          {active && (
            <div className="mega-menu wrap">
              <div className="mega-sidebar">
                {navigationCategories.map((c) => (
                  <button
                    key={c.id}
                    className={active === c.id ? "active" : ""}
                    onClick={() => {setMenuScope("all");setActive(c.id);}}
                    onMouseEnter={() => {setMenuScope("all");setActive(c.id);}}
                  >
                    <StoreText>{c.name}</StoreText>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <div className="mega-content">
                <div className="mega-heading">
                  <h2>
                    <StoreText>{active === "all"
                      ? "Tous nos univers"
                      : activeCategory?.name}</StoreText>
                  </h2>
                  <button
                    aria-label={t("Fermer le menu")}
                    onClick={() => setActive(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
                {active === "all" ? (
                  <div className="mega-links mega-links-all">
                    {navigationCategories.map((c) => (
                      <Link
                        key={c.id}
                        href={c.href}
                        onClick={() => setActive(null)}
                      >
                        <StoreText>{c.name}</StoreText>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`mega-columns mega-columns-${Math.max(
                      1,
                      Math.min(3, columns.length),
                    )}`}
                  >
                    {columns.map((column, columnIndex) => (
                      <div className="mega-column" key={columnIndex}>
                        {column.map((menuItem) =>
                          menuItem.children?.length ? (
                            <div className="mega-node mega-parent" key={menuItem.href}>
                              <Link
                                className="mega-parent-link"
                                href={menuItem.href}
                                onClick={() => setActive(null)}
                              >
                                <StoreText>{menuItem.name}</StoreText>
                              </Link>
                              <div className="mega-children">
                                <SubmenuLinks items={menuItem.children} onNavigate={() => setActive(null)} />
                              </div>
                            </div>
                          ) : (
                            <Link
                              className="mega-node mega-direct"
                              key={menuItem.href}
                              href={menuItem.href}
                              onClick={() => setActive(null)}
                            >
                              <StoreText>{menuItem.name}</StoreText>
                            </Link>
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Link
                  href={active === "all" ? "/recherche" : activeCategory?.href ?? "/recherche"}
                  className="text-link"
                  onClick={() => setActive(null)}
                ><StoreText>
                  Voir tous les produits
                </StoreText></Link>
              </div>
            </div>
          )}
        </nav>
      </header>
      <dialog
        ref={drawer}
        className="mobile-drawer"
        aria-label={t("Navigation mobile")}
        onCancel={() => setMobile(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMobile(false);
        }}
      >
        <div className="drawer-heading">
          <strong><StoreText>Nos catégories</StoreText></strong>
          <button
            aria-label={t("Fermer les catégories")}
            onClick={() => {
              setMobile(false);
              toggle.current?.focus();
            }}
          >
            <X />
          </button>
        </div>
        {mobile && <MobileCategoryMenu nodes={navigation.mobile} onNavigate={() => setMobile(false)} />}
        <Link href="/compte" prefetch={true} className="navigation-link" onClick={() => setMobile(false)}><StoreText>
          Mon compte
          </StoreText><NavigationFeedback />
        </Link>
        <Link href="/favoris" onClick={() => setMobile(false)}><StoreText>
          Mes favoris (</StoreText>{favorites.length})
        </Link>
      </dialog>
    </>
  );
}
