"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PackageSearch, RotateCcw, SlidersHorizontal } from "lucide-react";
import { categories, products, type CategoryFilter } from "@/data/catalog";
import { ProductCard } from "./product-card";
import { useStore } from "./store-provider";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const catalogueFilters: CategoryFilter[] = [
  { key: "category", label: "Famille de produits", options: categories.map((category) => category.name) },
];

export function CatalogView({ category, favoritesOnly = false }: { category?: string; favoritesOnly?: boolean }) {
  const params = useSearchParams();
  const query = params.get("q") || "";
  const { favorites } = useStore();
  const [sort, setSort] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const currentCategory = categories.find((item) => item.slug === category);
  const title = favoritesOnly
    ? "Mes favoris"
    : currentCategory?.name || (query ? `Résultats pour « ${query} »` : "Catalogue");

  const list = useMemo(() => {
    const matches = products.filter((product) => {
      if (category && product.category !== category) return false;
      if (favoritesOnly && !favorites.includes(product.id)) return false;
      if (params.has("promo") && !product.oldPrice) return false;
      if (params.has("nouveau") && !product.fresh) return false;
      if (query) {
        const categoryName = categories.find((item) => item.slug === product.category)?.name || "";
        const searchable = normalize([product.name, product.brand, product.manufacturerRef, product.id, categoryName].join(" "));
        if (!searchable.includes(normalize(query))) return false;
      }
      return Object.entries(selected).every(([key, values]) => {
        if (!values.length) return true;
        if (key === "category") {
          const name = categories.find((item) => item.slug === product.category)?.name;
          return name ? values.includes(name) : false;
        }
        if (key === "brand") return values.includes(product.brand);
        return values.includes(product.attributes?.[key] || "");
      });
    });
    return [...matches].sort((a, b) => {
      if (sort === "low") return a.price - b.price;
      if (sort === "high") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [category, favorites, favoritesOnly, params, query, selected, sort]);

  const brands = [...new Set(products.filter((product) => !category || product.category === category).map((product) => product.brand))];
  const filters = (currentCategory?.filters || catalogueFilters).map((item) =>
    item.key === "brand" ? { ...item, options: brands } : item,
  );
  const activeFilterCount = Object.values(selected).reduce((total, values) => total + values.length, 0);

  function toggleFilter(key: string, option: string) {
    setSelected((current) => {
      const values = current[key] || [];
      return {
        ...current,
        [key]: values.includes(option) ? values.filter((value) => value !== option) : [...values, option],
      };
    });
  }

  return (
    <div className="wrap catalogue-page">
      <div className="breadcrumbs">
        <Link href="/">Accueil</Link><span>/</span>
        {currentCategory && <><Link href="/recherche">Catalogue</Link><span>/</span></>}
        <span aria-current="page">{title}</span>
      </div>
      <header className="catalogue-heading">
        <div>
          <span className="catalogue-kicker">CATALOGUE GO ELEC</span>
          <h1>{title}</h1>
          <p>
            {currentCategory?.description ||
              (favoritesOnly
                ? "Retrouvez ici les références enregistrées pour vos projets."
                : "Parcourez les familles de produits et affinez votre recherche avec des critères techniques adaptés.")}
          </p>
        </div>
      </header>

      {currentCategory && (
        <nav className="subcategory-tags" aria-label={`Sous-catégories ${currentCategory.name}`}>
          {currentCategory.subcategories.map((subcategory) => <span key={subcategory}>{subcategory}</span>)}
        </nav>
      )}

      <div className="catalog-toolbar">
        <strong>{list.length} produit{list.length !== 1 ? "s" : ""}</strong>
        <button className="filter-toggle" onClick={() => setShowFilters((shown) => !shown)} aria-expanded={showFilters}>
          <SlidersHorizontal size={16} /> Filtres{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </button>
        <label>
          Trier par
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="relevance">Pertinence</option>
            <option value="low">Prix croissant</option>
            <option value="high">Prix décroissant</option>
            <option value="rating">Meilleures notes</option>
          </select>
        </label>
      </div>

      <div className="catalog-layout">
        <aside className={`filters ${showFilters ? "shown" : ""}`}>
          <h2><SlidersHorizontal size={17} /> Filtrer</h2>
          {filters.map((filter) => (
            <fieldset className="filter-group" key={filter.key}>
              <legend>{filter.label}</legend>
              {filter.options.length ? filter.options.map((option) => (
                <label key={option}>
                  <input
                    type="checkbox"
                    checked={(selected[filter.key] || []).includes(option)}
                    onChange={() => toggleFilter(filter.key, option)}
                  />
                  <span>{option}</span>
                </label>
              )) : <small>Les marques apparaîtront avec les références.</small>}
            </fieldset>
          ))}
          {activeFilterCount > 0 && (
            <button className="reset-filters" onClick={() => setSelected({})}>
              <RotateCcw size={14} /> Réinitialiser
            </button>
          )}
        </aside>

        {list.length ? (
          <div className="catalog-products">
            {list.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="empty-state catalog-empty">
            <PackageSearch size={43} />
            <h2>{favoritesOnly ? "Votre sélection est vide" : products.length ? "Aucun produit ne correspond" : "Les références arrivent bientôt"}</h2>
            <p>
              {favoritesOnly
                ? "Les produits ajoutés aux favoris apparaîtront ici."
                : products.length
                  ? "Modifiez vos critères pour élargir les résultats."
                  : "La structure du catalogue est prête. Les produits seront publiés après validation de leurs informations, prix et disponibilités."}
            </p>
            {!favoritesOnly && <Link href="/" className="button navy">Voir toutes les familles</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
