"use client";
import { StoreText, useStorefrontLanguage } from "@/components/storefront-language";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, SearchX } from "lucide-react";
import type { CatalogCategory, CatalogFilter, CatalogProduct } from "@/lib/catalog-model";
import { ProductCard } from "./product-card";
import { useStore } from "./store-provider";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function CatalogView({
  category,
  categories,
  products,
  query = "",
  title: suppliedTitle,
  availableFilters = [],
  favoritesOnly = false,
}: {
  category?: CatalogCategory | null;
  categories: CatalogCategory[];
  products: CatalogProduct[];
  query?: string;
  title?: string;
  availableFilters?: CatalogFilter[];
  favoritesOnly?: boolean;
}) {
  const { t, locale } = useStorefrontLanguage();
  const params = useSearchParams();
  const q = query || params.get("q") || "";
  const { favorites } = useStore();
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("popular");
  const [available, setAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [department, setDepartment] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [technical, setTechnical] = useState<Record<string, string>>({});
  const cat = category;
  const categoryTrail: CatalogCategory[] = [];
  let trailItem: CatalogCategory | null | undefined = cat;
  while (trailItem) {
    categoryTrail.unshift(trailItem);
    trailItem = trailItem.parentId ? categories.find((item) => item.id === trailItem?.parentId) : undefined;
  }
  const title = favoritesOnly
    ? "Mes favoris"
    : suppliedTitle || cat?.name ||
      (q
        ? `Résultats pour « ${q} »`
        : params.has("promo")
          ? "Les bons plans"
          : params.has("nouveau")
            ? "Les nouveautés"
            : "Tous nos produits");
  let list = products.filter(
    (p) =>
      (!favoritesOnly || favorites.includes(p.id)) &&
      (!params.has("promo") || p.isOnSale) &&
      (!params.has("nouveau") || p.isNew) &&
      (!q ||
        normalize(
          [
            p.name,
            p.brand,
            p.manufacturerReference || "",
            p.sku,
            p.category?.name || "",
            ...categories.filter((category) => p.categoryIds.includes(category.id)).map((category) => category.name),
          ].join(" "),
        ).includes(normalize(q))),
  );
  const brands = [...new Set(list.map((p) => p.brand).filter(Boolean))];
  const departmentPath = categories.find((category) => category.id === department)?.path;
  const departmentIds = new Set(categories.filter((category) => category.id === department || (departmentPath && category.path.startsWith(`${departmentPath}/`))).map((category) => category.id));
  list = list.filter(
    (p) =>
      (!brand || p.brand === brand) &&
      (!department || p.categoryIds.some((id) => departmentIds.has(id))) &&
      (!available || p.stock > 0) &&
      (!maxPrice || p.price <= Number(maxPrice)),
  );
  list = list.filter((product) => Object.entries(technical).every(([slug, selected]) => !selected || product.attributes.some((attribute) => attribute.slug === slug && attribute.value === selected)));
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
  return (
    <div className="wrap catalogue-page">
      <div className="breadcrumbs">
        <Link href="/"><StoreText>Accueil</StoreText></Link>
        {categoryTrail.map((item, index) => <span key={item.id}><span>/</span>{index < categoryTrail.length - 1 ? <Link href={`/categorie/${item.path}`}><StoreText>{item.name}</StoreText></Link> : <StoreText>{item.name}</StoreText>}</span>)}
        {!categoryTrail.length && <><span>/</span><StoreText>{title}</StoreText></>}
      </div>
      <h1><StoreText>{title}</StoreText></h1>
      {cat?.description && <p className="category-description">{cat.description}</p>}
      {cat && <div className="subcategory-tags">
        {categories.filter((item) => item.parentId === cat.id).map((item) => (
          <Link href={`/categorie/${item.path}`} key={item.id}><StoreText>{item.name}</StoreText></Link>
        ))}
      </div>}
      <div className="catalog-toolbar">
        <span>
          {list.length} {locale === "ar" ? "منتج" : `produit${list.length !== 1 ? "s" : ""}`}
        </span>
        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={16} /><StoreText> Filtres
        </StoreText></button>
        <label><StoreText>
          Trier par</StoreText>{" "}
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popular"><StoreText>Notre sélection</StoreText></option>
            <option value="low"><StoreText>Prix croissant</StoreText></option>
            <option value="high"><StoreText>Prix décroissant</StoreText></option>
            <option value="rating"><StoreText>Meilleures notes</StoreText></option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside className={`filters ${showFilters ? "shown" : ""}`}>
          <h2>
            <SlidersHorizontal size={17} /><StoreText> Filtrer les produits
          </StoreText></h2>
          {!category && (
            <label><StoreText>
              Catégorie
              </StoreText><select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value=""><StoreText>Toutes les catégories</StoreText></option>
                {categories.filter((c) => !c.parentId).map((c) => (
                  <option value={c.id} key={c.id}>
                    <StoreText>{c.name}</StoreText>
                  </option>
                ))}
              </select>
            </label>
          )}
          <label><StoreText>
            Marque
            </StoreText><select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value=""><StoreText>Toutes les marques</StoreText></option>
              {brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label><StoreText>
            Prix maximum (DH)
            </StoreText><input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={t("Sans limite")}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />{" "}<StoreText>
            En stock uniquement
          </StoreText></label>
          {availableFilters.map((filter) => {
            const values = [...new Set(products.flatMap((product) => product.attributes.filter((attribute) => attribute.slug === filter.slug).map((attribute) => attribute.value)))];
            if (!values.length) return null;
            return <label key={filter.slug}><StoreText>{filter.name}</StoreText>{filter.unit ? ` (${filter.unit})` : ""}<select value={technical[filter.slug] || ""} onChange={(event) => setTechnical((current) => ({ ...current, [filter.slug]: event.target.value }))}><option value=""><StoreText>Toutes les valeurs</StoreText></option>{values.map((value) => <option key={value}>{value}</option>)}</select></label>;
          })}
          <button
            className="text-link"
            onClick={() => {
              setBrand("");
              setAvailable(false);
              setDepartment("");
              setMaxPrice("");
              setTechnical({});
            }}
          ><StoreText>
            Réinitialiser les filtres
          </StoreText></button>
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
              <StoreText>{favoritesOnly
                ? "Votre sélection commence ici"
                : "Aucun produit trouvé"}</StoreText>
            </h2>
            <p>
              <StoreText>{favoritesOnly
                ? "Ajoutez vos produits préférés grâce au cœur sur chaque fiche."
                : "Essayez une autre référence ou modifiez vos filtres."}</StoreText>
            </p>
            <Link href="/recherche" className="button navy"><StoreText>
              Explorer le catalogue
            </StoreText></Link>
          </div>
        )}
      </div>
    </div>
  );
}
