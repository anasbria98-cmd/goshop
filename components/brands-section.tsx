import Link from "next/link";
import { StoreText } from "./storefront-language";
import { BrandLogo } from "./featured-brand-logo";

import { featuredBrandSlots, type FeaturedBrandLayout } from "@/lib/featured-brands";

export function BrandsSection({ brands }: { brands: FeaturedBrandLayout }) {
  const slots = featuredBrandSlots(brands.brands, brands.slotCount);
  if (!slots.length) return null;
  return <section className="brands wrap"><div className="section-heading"><h2><StoreText>Les marques qui font la différence</StoreText></h2><Link href="/recherche"><StoreText>Toutes nos marques</StoreText></Link></div><div className="brand-list">{slots.map((brand, index) => {
    if (!brand) return <span key={`empty-${index}`} className="brand-logo" aria-hidden="true" />;
    return <Link href={`/recherche?marque=${encodeURIComponent(brand.slug)}`} key={brand.id} className={`brand-logo brand-${brand.slug}`}>
      <BrandLogo brand={brand} />
    </Link>;
  })}</div></section>;
}
