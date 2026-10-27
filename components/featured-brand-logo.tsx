import Image from "next/image";
import { brandAssets } from "@/lib/brand-assets";
import type { FeaturedBrand } from "@/lib/featured-brands";

/** Shared artwork and sizing for the storefront and its admin layout preview. */
export function BrandLogo({ brand }: { brand: Pick<FeaturedBrand, "name" | "slug" | "logo_url"> }) {
  const logo = brandAssets[brand.slug] ?? (brand.logo_url ? { src: brand.logo_url, width: 128, height: 42 } : null);
  return logo ? <Image src={logo.src} width={logo.width} height={logo.height} alt={brand.name} className="manufacturer-logo" unoptimized /> : <span className="brand-logo-fallback">{brand.name}</span>;
}
