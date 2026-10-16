import type { CatalogCategory, CatalogProduct } from "./catalog-model";

export type HomepageDepartment = {
  category: CatalogCategory;
  products: CatalogProduct[];
  count: number;
};

export function homepageDepartments(categories: CatalogCategory[], products: CatalogProduct[]): HomepageDepartment[] {
  return categories.filter((category) => !category.parentId).flatMap((category) => {
    const ids = new Set(categories.filter((child) => child.path === category.path || child.path.startsWith(`${category.path}/`)).map((child) => child.id));
    const selection = products.filter((product) => product.categoryIds.some((id) => ids.has(id)));
    return selection.length ? [{ category, products: selection.slice(0, 6), count: selection.length }] : [];
  });
}

export function philipsCampaignProducts(products: CatalogProduct[], preferred: CatalogProduct[]): CatalogProduct[] {
  const published = new Map(products.filter((product) => product.brandSlug === "philips").map((product) => [product.id, product]));
  return [...new Map([...preferred, ...products].flatMap((product) => {
    const visible = published.get(product.id);
    return visible ? [[visible.id, visible] as const] : [];
  })).values()].slice(0, 4);
}
