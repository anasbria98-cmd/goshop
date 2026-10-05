"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, SearchX } from "lucide-react";
import { categories, products } from "@/data/catalog";
import { ProductCard } from "./product-card";
import { useStore } from "./store-provider";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function CatalogView({
  category,
  favoritesOnly = false,
}: {
  category?: string;
  favoritesOnly?: boolean;
}) {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const { favorites } = useStore();
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("popular");
  const [available, setAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [department, setDepartment] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const cat = categories.find((c) => c.slug === category);
  const title = favoritesOnly
    ? "Mes favoris"
    : cat?.name ||
      (q
        ? `Résultats pour « ${q} »`
        : params.has("promo")
          ? "Les bons plans"
          : params.has("nouveau")
            ? "Les nouveautés"
            : "Tous nos produits");
  let list = products.filter(
    (p) =>
      (!category || p.category === category) &&
      (!favoritesOnly || favorites.includes(p.id)) &&
      (!params.has("promo") || p.oldPrice) &&
      (!params.has("nouveau") || p.fresh) &&
      (!q ||
        normalize(
          [
            p.name,
            p.brand,
            p.manufacturerRef,
            p.id,
            categories.find((c) => c.slug === p.category)?.name,
          ].join(" "),
        ).includes(normalize(q))),
  );
  const brands = [...new Set(list.map((p) => p.brand))];
  list = list.filter(
    (p) =>
      (!brand || p.brand === brand) &&
      (!department || p.category === department) &&
      (!available || p.stock > 0) &&
      (!maxPrice || p.price <= Number(maxPrice)),
  );
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
  return (
    <div className="wrap catalogue-page">
      <div className="breadcrumbs">
        <Link href="/">Accueil</Link>
        <span>/</span>
        {title}
      </div>
      <h1>{title}</h1>
      {cat && (
        <div className="subcategory-tags">
          {cat.subcategories.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
      <div className="catalog-toolbar">
        <span>
          {list.length} produit{list.length !== 1 ? "s" : ""}
        </span>
        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={16} /> Filtres
        </button>
        <label>
          Trier par{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popular">Notre sélection</option>
            <option value="low">Prix croissant</option>
            <option value="high">Prix décroissant</option>
            <option value="rating">Meilleures notes</option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside className={`filters ${showFilters ? "shown" : ""}`}>
          <h2>
            <SlidersHorizontal size={17} /> Filtrer les produits
          </h2>
          {!category && (
            <label>
              Catégorie
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option value={c.slug} key={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Marque
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">Toutes les marques</option>
              {brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            Prix maximum (DH)
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Sans limite"
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />{" "}
            En stock uniquement
          </label>
          <button
            className="text-link"
            onClick={() => {
              setBrand("");
              setAvailable(false);
              setDepartment("");
              setMaxPrice("");
            }}
          >
            Réinitialiser les filtres
          </button>
        </aside>
        {list.length ? (
          <div className="catalog-products">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <SearchX size={42} />
            <h2>
              {favoritesOnly
                ? "Votre sélection commence ici"
                : "Aucun produit trouvé"}
            </h2>
            <p>
              {favoritesOnly
                ? "Ajoutez vos produits préférés grâce au cœur sur chaque fiche."
                : "Essayez une autre référence ou modifiez vos filtres."}
            </p>
            <Link href="/recherche" className="button navy">
              Explorer le catalogue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
