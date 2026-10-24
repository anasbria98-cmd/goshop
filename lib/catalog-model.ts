export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  path: string;
  children?: CatalogCategory[];
};

export type CatalogAttribute = {
  slug: string;
  name: string;
  unit: string | null;
  value: string;
};
export type CatalogFilter = { slug: string; name: string; unit: string | null };

export type CatalogVariant = {
  id: string;
  name: string;
  colorName: string;
  colorHex: string;
  finish: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  imageUrl: string;
};

export type CatalogProduct = {
  colors?: {name:string;hex:string}[];
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  brandSlug: string | null;
  category: CatalogCategory | null;
  categoryIds: string[];
  imageUrl: string | null;
  images: { url: string; alt: string }[];
  price: number;
  compareAtPrice: number | null;
  rating: number;
  reviewCount: number;
  manufacturerReference: string | null;
  stock: number;
  allowBackorder: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  isOnSale: boolean;
  featured: boolean;
  shortDescription: string | null;
  description: string | null;
  attributes: CatalogAttribute[];
  hasColorVariants?: boolean;
  variants?: CatalogVariant[];
  selectedVariant?: CatalogVariant;
};

export const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DH";
