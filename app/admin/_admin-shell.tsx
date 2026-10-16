"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Badge,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ChevronRight,
  Package,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Tags,
  TicketPercent,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { BrandLogo } from "@/components/brand-logo";
import { NavigationFeedback } from "@/components/navigation-feedback";

const mainLinks = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/products", "Produits", Package],
  ["/admin/categories", "Catégories", Tags],
  ["/admin/brands", "Marques", Badge],
  ["/admin/inventory", "Stocks", Warehouse],
  ["/admin/orders", "Commandes", ShoppingBag],
  ["/admin/customers", "Clients", Users],
  ["/admin/promotions", "Promotions", TicketPercent],
  ["/admin/reviews", "Avis", Star],
  ["/admin/media", "Médias", Images],
  ["/admin/sliders", "Gestion des Sliders", Images],
  ["/admin/settings", "Paramètres", Settings],
] as const;

const managementLinks = [
  ["/admin/administrators", "Administrateurs", Shield],
  ["/admin/audit", "Journal d’audit", ScrollText],
] as const;

export function AdminShell({
  children,
  adminName,
  email,
  role,
}: {
  children: React.ReactNode;
  adminName: string;
  email: string;
  role: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);
  const currentPage = [...mainLinks, ...managementLinks].find(([href]) => isActive(href))?.[1] ?? "Dashboard";

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">Aller au contenu</a>
      <button className={`admin-drawer-backdrop${open ? " is-open" : ""}`} aria-label="Fermer le menu" onClick={() => setOpen(false)} />
      <aside className={`admin-sidebar${open ? " is-open" : ""}`}>
        <div className="admin-sidebar-heading">
          <BrandLogo admin href="/admin" />
          <button className="admin-sidebar-close" type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <nav aria-label="Navigation administration">
          <span className="admin-nav-section admin-nav-section--first">Votre boutique</span>
          {mainLinks.map(([href, label, Icon], index) => (
            <div className="admin-nav-item" key={href}>
            {index === 7 ? <span className="admin-nav-section">Développement</span> : href === "/admin/settings" ? <span className="admin-nav-section">Configuration</span> : null}
            <Link href={href} onClick={() => setOpen(false)} className={isActive(href) ? "is-active" : undefined} aria-current={isActive(href) ? "page" : undefined}>
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
              <NavigationFeedback />
            </Link>
            </div>
          ))}
          <span className="admin-nav-section">Gestion avancée</span>
          {managementLinks.map(([href, label, Icon]) => (
            <Link href={href} key={href} onClick={() => setOpen(false)} className={isActive(href) ? "is-active" : undefined} aria-current={isActive(href) ? "page" : undefined}>
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
              <NavigationFeedback />
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            <button className="admin-menu-trigger" type="button" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></button>
            <div className="admin-breadcrumb"><Link href="/admin">GO ELEC</Link><ChevronRight size={13} aria-hidden="true" /><strong>{currentPage}</strong></div>
          </div>
          <form className="admin-global-search" action="/admin/products" role="search">
            <Search size={16} aria-hidden="true" /><input name="q" aria-label="Rechercher dans les produits" placeholder="Rechercher un produit…" /><button type="submit" aria-label="Lancer la recherche"><ChevronRight size={17} /></button>
          </form>
          <div className="admin-topbar-account">
            <span className="admin-avatar" aria-hidden="true"><Image src="/branding/isometric_electrical_repair_cube_logo.png" width={410} height={450} alt="" unoptimized /></span>
            <span className="admin-account-copy"><strong>{adminName}</strong><small>{email || role.replace("_", " ")}</small></span>
            <form action={signOut}>
              <button type="submit" title="Se déconnecter"><LogOut aria-hidden="true" size={17} /><span>Déconnexion</span></button>
            </form>
          </div>
        </header>
        <main className="admin-workspace" id="admin-main">{children}</main>
      </div>
    </div>
  );
}
