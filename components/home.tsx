import type { FeaturedBrandLayout } from "@/lib/featured-brands";
import { StoreText } from "@/components/storefront-language";
import Link from "next/link";
import Image from "next/image";
import { Truck, BadgePercent, PackageCheck, Headphones, Check, ArrowRight, Zap } from "lucide-react";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-model";
import type { HeroSlide, SlideLocation } from "@/lib/home-slides";
import { HeroCarousel } from "./hero-carousel";
import { ProductSection } from "./product-section";
import { ProductCard } from "./product-card";
import type { HomepageDepartment } from "@/lib/homepage-model";
import { BrandsSection } from "./brands-section";
import utilityStyles from "./utility-items.module.css";

export function Benefits() {
  return <div className={`benefits wrap ${utilityStyles.featureIcons}`}>{[
    [Truck, "Livraison partout au Maroc", "À domicile ou sur votre chantier"],
    [PackageCheck, "Les grandes marques", "Le choix de la qualité"],
    [BadgePercent, "Des prix justes", "Pour tous vos projets"],
    [Headphones, "À votre écoute", "Un conseil, un projet ?"],
  ].map(([Icon, title, text]) => {
    const I = Icon as typeof Truck;
    return <div className="benefit" key={String(title)}><I size={28} strokeWidth={1.5} /><div><strong><StoreText>{String(title)}</StoreText></strong><span><StoreText>{String(text)}</StoreText></span></div></div>;
  })}</div>;
}

export function Hero({ slides }: { slides: Record<SlideLocation, HeroSlide[]> }) {
  return <>
    <section className="promo-hero wrap" aria-label="Nos collections d’appareillage">
      <HeroCarousel label="Collections Omega et Galaxy" primary slides={slides.primary} />
      <HeroCarousel label="Collections Karla et Millenium" slides={slides.secondary} />
    </section>
    <Benefits />
  </>;
}

export function CategorySection({ departments }: { departments: HomepageDepartment[] }) {
  const highlighted = departments.filter(({ products }) => products.some((product) => product.featured));
  const highlightedIds = new Set(highlighted.map(({ category }) => category.id));
  const selected = new Set([...highlighted, ...departments.filter(({ category }) => !highlightedIds.has(category.id))].slice(0, 8).map(({ category }) => category.id));
  const roots = departments.filter(({ category }) => selected.has(category.id));
  if (!roots.length) return null;
  return <section className="categories-section wrap">
    <div className="section-heading"><h2><StoreText>Catégories principales</StoreText></h2><Link href="/recherche"><StoreText>Explorer le catalogue</StoreText></Link></div>
    <div className="category-grid">{roots.map(({ category, products }) => {
      const image = category.imageUrl || products.find((product) => product.imageUrl)?.imageUrl;
      return <Link className="category-card" href={`/categorie/${category.path}`} key={category.id}>
      <div>{image ? <Image src={image} width={160} height={120} alt="" /> : <span className="category-image-placeholder"><Zap size={38} /></span>}</div>
      <strong><StoreText>{category.slug === "appareillage" ? "Appareillage" : category.name}</StoreText></strong><span><StoreText>Découvrir</StoreText></span>
    </Link>;
    })}</div>
  </section>;
}

function PhilipsCampaign({ products }: { products: CatalogProduct[] }) {
  const selection = products.filter((product) => product.brandSlug === "philips");
  if (!selection.length) return null;
  return <section className="campaign campaign-philips wrap">
    <div className="campaign-story philips-story"><span className="campaign-brand">PHILIPS</span><div className="campaign-copy"><span className="campaign-kicker"><StoreText>LUMIÈRE SUR VOS PROJETS</StoreText></span><h2><StoreText>Une belle lumière change toute la pièce.</StoreText></h2><p><StoreText>Une sélection LED efficace, chaleureuse et pensée pour durer.</StoreText></p><Link className="button white" href="/recherche?q=Philips"><StoreText>Voir tout l’éclairage </StoreText><ArrowRight size={16} /></Link></div>{selection[0].imageUrl && <Image className="campaign-hero-product" src={selection[0].imageUrl} width={330} height={330} alt={selection[0].name} />}<span className="light-orbit" aria-hidden="true" /></div>
    <div className="campaign-shelf"><div className="campaign-shelf-heading"><div><span><StoreText>NOTRE SÉLECTION</StoreText></span><h3><StoreText>Les essentiels Philips</StoreText></h3></div><Link href="/recherche?q=Philips"><StoreText>Toute la marque</StoreText></Link></div><div className="campaign-product-grid philips-products">{selection.map((product) => <ProductCard product={product} key={product.id} />)}</div></div>
  </section>;
}

function ExpertCampaign({ products }: { products: CatalogProduct[] }) {
  if (!products.length) return null;
  return <section className="campaign campaign-october wrap">
    <div className="campaign-story october-story"><span className="month-chip"><StoreText>SÉLECTION EXPERTS</StoreText></span><div className="campaign-copy"><span className="campaign-kicker"><StoreText>LE CHANTIER DU MOMENT</StoreText></span><h2><StoreText>Tout ce qu’il faut pour une installation bien pensée.</StoreText></h2><p><StoreText>Protection, appareillage et coffrets : une sélection claire pour avancer sans perdre de temps.</StoreText></p><ul className="project-points"><li><b>01</b><StoreText> Choisir</StoreText></li><li><b>02</b><StoreText> Équiper</StoreText></li><li><b>03</b><StoreText> Installer</StoreText></li></ul><Link className="button white" href="/categorie/materiel-electrique"><StoreText>Voir la sélection </StoreText><ArrowRight size={16} /></Link></div><div className="october-visual" aria-hidden="true"><Zap size={38} fill="currentColor" /><span>GO</span></div></div>
    <div className="campaign-shelf"><div className="campaign-shelf-heading"><div><span><StoreText>PRÊT POUR LE CHANTIER</StoreText></span><h3><StoreText>La sélection de nos experts</StoreText></h3></div><Link href="/recherche"><StoreText>Voir le catalogue</StoreText></Link></div><div className="campaign-product-grid october-products">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div></div>
  </section>;
}

export function Home({ slides, featured, bestSellers, newProducts, sale, departments, brands, philipsProducts }: { slides: Record<SlideLocation, HeroSlide[]>; categories: CatalogCategory[]; featured: CatalogProduct[]; bestSellers: CatalogProduct[]; newProducts: CatalogProduct[]; sale: CatalogProduct[]; departments: HomepageDepartment[]; brands: FeaturedBrandLayout; heroProduct: CatalogProduct | null; philipsProducts: CatalogProduct[] }) {
  return <>
    <Hero slides={slides} />
    <CategorySection departments={departments} />
    {bestSellers.length > 0 && <ProductSection title="Nos meilleures ventes" eyebrow="LES ESSENTIELS DE VOS CHANTIERS" products={bestSellers} />}
    <PhilipsCampaign products={philipsProducts} />
    <ExpertCampaign products={featured.slice(0, 4)} />
    {sale.length > 0 && <ProductSection title="Les bons plans du moment" eyebrow="BIEN S’ÉQUIPER, MOINS DÉPENSER" products={sale} href="/recherche?promo=1" id="promotions" />}
    <section className="connected-promo wrap"><div><span className="eyebrow"><StoreText>UNE MAISON PLUS INTELLIGENTE</StoreText></span><h2><StoreText>Le confort connecté, tout simplement.</StoreText></h2><p><StoreText>Commandez, programmez et simplifiez votre quotidien.</StoreText></p></div><Image className="connected-image" src="/products/socket.webp" width={100} height={100} alt="Prise pour la maison" /><Link className="button navy" href="/categorie/domotique"><StoreText>Découvrir la domotique</StoreText></Link></section>
    {newProducts.length > 0 && <ProductSection title="Nouveautés" products={newProducts} href="/recherche?nouveau=1" />}
    {departments.map(({ category, products, count }) => <ProductSection key={category.id} title={category.slug === "appareillage" ? "Appareillage" : category.name} eyebrow={`${count} PRODUIT${count > 1 ? "S" : ""} DANS CET UNIVERS`} products={products} href={`/categorie/${category.path}`} />)}
    <BrandsSection brands={brands} />
    {featured.length > 0 && <ProductSection title="Notre sélection pour vos projets" products={featured} />}
    <section className="seo wrap"><div><span className="eyebrow"><StoreText>LE BON MATÉRIEL. LE BON PARTENAIRE.</StoreText></span><h2><StoreText>GO ELEC, votre spécialiste</StoreText><br /><StoreText>du matériel électrique au Maroc</StoreText></h2></div><div><p><StoreText>Un chantier à équiper, une pièce à rénover ou une installation à moderniser ? GO ELEC réunit les essentiels de l’électricité pour les professionnels et les particuliers.</StoreText></p><p><StoreText>Comparez les références, préparez votre sélection et trouvez le matériel adapté à votre projet.</StoreText></p><span><Check size={16} /><StoreText> Des produits sélectionnés pour vos installations</StoreText></span></div></section>
  </>;
}
