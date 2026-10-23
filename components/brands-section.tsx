import Link from "next/link";
import Image from "next/image";
import { StoreText } from "./storefront-language";
import { brandAssets } from "@/lib/brand-assets";

export function BrandsSection({ brands, homepage = false }: { brands: [string, string][]; homepage?: boolean }) {
  const homepageBrands: [string, string][] = brands.map(([slug, name]) =>
    slug === "ja-solar" ? ["goled", "GOLED"] : slug === "wago" ? ["ingelec", "Ingelec"] : [slug, name],
  );
  if (homepageBrands.length > 0 && !homepageBrands.some(([slug]) => slug === "ingco")) {
    homepageBrands.push(["ingco", "INGCO"]);
  }
  let goledCount = 0;
  return <>
    {homepageBrands.length > 0 && <section className="brands wrap"><div className="section-heading"><h2><StoreText>Les marques qui font la différence</StoreText></h2><Link href="/recherche"><StoreText>Toutes nos marques</StoreText></Link></div><div className="brand-list">{homepageBrands.map(([slug, name]) => {
      if (homepage && slug === "schneider-electric") return null;
      const replaceLogo = homepage && slug === "goled" && ++goledCount === 2;
      const logo = brandAssets[replaceLogo ? "schneider-electric" : slug];
      return <Link href={`/recherche?marque=${encodeURIComponent(slug)}`} key={slug} className={`brand-logo brand-${replaceLogo ? "schneider-electric" : slug}`}>
        {logo ? <Image src={logo.src} width={logo.width} height={logo.height} alt={replaceLogo ? "Schneider Electric" : name} className="manufacturer-logo" unoptimized /> : <span className="brand-logo-fallback">{name}</span>}
      </Link>;
    })}</div></section>}
  </>;
}
