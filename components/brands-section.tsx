import Link from "next/link";
import Image from "next/image";
import { StoreText } from "./storefront-language";
import { brandAssets } from "@/lib/brand-assets";

import { featuredBrandSlots, type FeaturedBrand } from "@/lib/featured-brands";

export function BrandsSection({ brands }: { brands: FeaturedBrand[] }) {
  const slots = featuredBrandSlots(brands);
  if (!slots.length) return null;
  return <section className="brands wrap"><div className="section-heading"><h2><StoreText>Les marques qui font la différence</StoreText></h2><Link href="/recherche"><StoreText>Toutes nos marques</StoreText></Link></div><div className="brand-list">{slots.map((brand, index) => {
    if (!brand) return <span key={`empty-${index}`} className="brand-logo" aria-hidden="true" />;
    // Retain the existing supplied artwork; uploaded logos cover other brands.
    const logo = brandAssets[brand.slug] ?? (brand.logo_url ? { src: brand.logo_url, width: 128, height: 42 } : null);
    return <Link href={`/recherche?marque=${encodeURIComponent(brand.slug)}`} key={brand.id} className={`brand-logo brand-${brand.slug}`}>
      {logo ? <Image src={logo.src} width={logo.width} height={logo.height} alt={brand.name} className="manufacturer-logo" unoptimized /> : <span className="brand-logo-fallback">{brand.name}</span>}
    </Link>;
  })}</div></section>;
}
