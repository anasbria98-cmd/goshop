import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AirVent,
  BadgePercent,
  BatteryCharging,
  Boxes,
  Cable,
  Check,
  CircuitBoard,
  Gauge,
  Headphones,
  HousePlug,
  LampCeiling,
  PackageCheck,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  SunMedium,
  ToggleLeft,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import { categories, products } from "@/data/catalog";
import { ProductSection } from "./product-section";

const categoryIcons: Record<string, LucideIcon> = {
  "materiel-electrique": CircuitBoard,
  "interrupteurs-prises": ToggleLeft,
  "tableaux-electriques": Boxes,
  "disjoncteurs-protections": ShieldCheck,
  "cables-fils": Cable,
  eclairage: LampCeiling,
  domotique: HousePlug,
  outillage: Wrench,
  securite: Shield,
  photovoltaique: SunMedium,
  "bornes-recharge": BatteryCharging,
  climatisation: AirVent,
};

const familyGroups = [
  {
    title: "Distribution & protection",
    slugs: ["materiel-electrique", "tableaux-electriques", "disjoncteurs-protections"],
  },
  {
    title: "Installation & finition",
    slugs: ["interrupteurs-prises", "cables-fils", "eclairage"],
  },
  {
    title: "Bâtiment & confort",
    slugs: ["domotique", "securite", "climatisation"],
  },
  {
    title: "Énergie & chantier",
    slugs: ["photovoltaique", "bornes-recharge", "outillage"],
  },
];

export function Benefits() {
  return (
    <div className="benefits wrap">
      {[
        [Truck, "Livraison partout au Maroc", "À domicile ou sur votre chantier"],
        [PackageCheck, "Des gammes organisées", "Trouvez vite la bonne famille"],
        [BadgePercent, "Des offres lisibles", "L’essentiel sans surcharge"],
        [Headphones, "À votre écoute", "Un conseil, un projet ?"],
      ].map(([Icon, title, text]) => {
        const I = Icon as LucideIcon;
        return (
          <div className="benefit" key={String(title)}>
            <I size={28} strokeWidth={1.5} />
            <div>
              <strong>{String(title)}</strong>
              <span>{String(text)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Hero() {
  return (
    <>
      <section className="hero-grid wrap">
        <div className="main-promo">
          <div className="hero-copy">
            <span className="hero-kicker">MATÉRIEL ÉLECTRIQUE · ÉNERGIE · CONFORT</span>
            <h1>
              Vos projets électriques,
              <br />
              <em>bien organisés.</em>
            </h1>
            <p>
              Des familles claires pour préparer une installation résidentielle,
              tertiaire ou professionnelle.
            </p>
            <Link className="button orange" href="/recherche">
              Explorer les catégories
            </Link>
            <div className="hero-proof">
              <ShieldCheck size={17} /> Une sélection structurée par usage et par métier
            </div>
          </div>
          <div className="hero-family-board" aria-label="Familles principales">
            {[
              ["disjoncteurs-protections", ShieldCheck, "Protection"],
              ["interrupteurs-prises", ToggleLeft, "Appareillage"],
              ["cables-fils", Cable, "Câbles"],
              ["eclairage", LampCeiling, "Éclairage"],
            ].map(([slug, Icon, label]) => {
              const I = Icon as LucideIcon;
              return (
                <Link href={`/categorie/${slug}`} key={String(slug)}>
                  <I size={28} />
                  <span>{String(label)}</span>
                </Link>
              );
            })}
          </div>
          <div className="hero-caption">L’ESSENTIEL POUR LE RÉSIDENTIEL, LE TERTIAIRE ET LE CHANTIER</div>
        </div>
        <aside className="secondary-promo">
          <span className="promo-label">UN CATALOGUE PENSÉ POUR ALLER VITE</span>
          <h2>Du tableau à la finition.</h2>
          <p>
            Naviguez par métier, usage et caractéristique technique pour trouver
            le bon équipement sans mélanger les familles.
          </p>
          <div className="secondary-family-list">
            <Link href="/categorie/tableaux-electriques"><Boxes size={18} /> Tableaux électriques</Link>
            <Link href="/categorie/disjoncteurs-protections"><ShieldCheck size={18} /> Protections</Link>
            <Link href="/categorie/materiel-electrique"><CircuitBoard size={18} /> Matériel électrique</Link>
          </div>
          <Link href="/categorie/materiel-electrique">Voir le matériel électrique</Link>
        </aside>
      </section>
      <Benefits />
    </>
  );
}

export function CategorySection() {
  return (
    <section className="categories-section wrap">
      <div className="section-heading">
        <div>
          <span className="eyebrow">UN CATALOGUE CLAIR, FAMILLE PAR FAMILLE</span>
          <h2>Catégories principales</h2>
        </div>
        <Link href="/recherche">Voir tout le catalogue</Link>
      </div>
      <div className="category-grid category-grid-complete">
        {categories.map((category) => {
          const Icon = categoryIcons[category.slug] || Boxes;
          return (
            <Link className="category-card" href={`/categorie/${category.slug}`} key={category.slug}>
              <div><Icon size={38} strokeWidth={1.55} /></div>
              <strong>{category.short}</strong>
              <span>{category.subcategories.length} sous-catégories</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FamilyDirectory() {
  return (
    <section className="family-directory wrap">
      <div className="section-heading">
        <div>
          <span className="eyebrow">REPÈRES DE NAVIGATION</span>
          <h2>Trouvez votre univers en un coup d’œil</h2>
        </div>
      </div>
      <div className="family-groups">
        {familyGroups.map((group, index) => {
          const GroupIcon = [CircuitBoard, SlidersHorizontal, HousePlug, Gauge][index];
          return (
            <article className="family-group" key={group.title}>
              <div className="family-group-title"><GroupIcon size={21} /><h3>{group.title}</h3></div>
              {group.slugs.map((slug) => {
                const category = categories.find((item) => item.slug === slug)!;
                return <Link href={`/categorie/${slug}`} key={slug}>{category.name}</Link>;
              })}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SolutionSections() {
  const solutions = [
    {
      slug: "photovoltaique",
      eyebrow: "PRODUIRE & STOCKER",
      title: "Solutions photovoltaïques",
      text: "Panneaux, conversion, stockage, fixation et protection réunis dans un univers cohérent.",
      icon: SunMedium,
    },
    {
      slug: "eclairage",
      eyebrow: "ÉCLAIRER CHAQUE ESPACE",
      title: "Éclairage",
      text: "Éclairage intérieur, extérieur, technique et de sécurité classé par usage.",
      icon: LampCeiling,
    },
    {
      slug: "materiel-electrique",
      eyebrow: "INSTALLER & RACCORDER",
      title: "Matériel électrique",
      text: "Commande, raccordement, alimentation et accessoires pour chaque installation.",
      icon: Zap,
    },
  ];
  return (
    <section className="solutions wrap">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DES UNIVERS CONÇUS PAR BESOIN</span>
          <h2>Les solutions GO ELEC</h2>
        </div>
      </div>
      <div className="solution-grid">
        {solutions.map((solution) => {
          const Icon = solution.icon;
          return (
            <Link href={`/categorie/${solution.slug}`} className={`solution-card solution-${solution.slug}`} key={solution.slug}>
              <Icon size={31} />
              <span>{solution.eyebrow}</span>
              <h3>{solution.title}</h3>
              <p>{solution.text}</p>
              <b>Découvrir</b>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PopularBrands() {
  const names = [...new Set(products.map((product) => product.brand))];
  if (!names.length) return null;
  return (
    <section className="brands wrap">
      <div className="section-heading"><h2>Marques populaires</h2><Link href="/recherche">Toutes nos marques</Link></div>
      <div className="brand-list">
        {names.map((name) => <Link href={`/recherche?q=${encodeURIComponent(name)}`} key={name} className="brand-logo">{name}</Link>)}
      </div>
    </section>
  );
}

export function Home() {
  const bestsellers = products.filter((product) => product.bestseller);
  const promotions = products.filter((product) => product.oldPrice);
  const newProducts = products.filter((product) => product.fresh);
  return (
    <>
      <Hero />
      <CategorySection />
      <FamilyDirectory />
      <ProductSection title="Meilleures ventes" eyebrow="LES PRODUITS LES PLUS CHOISIS" products={bestsellers} />
      <ProductSection title="Promotions" eyebrow="LES OFFRES DU MOMENT" products={promotions} href="/recherche?promo=1" id="promotions" />
      <ProductSection title="Nouveautés" products={newProducts} href="/recherche?nouveau=1" />
      <PopularBrands />
      <SolutionSections />
      <section className="seo wrap">
        <div>
          <span className="eyebrow">LE BON MATÉRIEL. LE BON PARTENAIRE.</span>
          <h2>GO ELEC, votre spécialiste<br />du matériel électrique au Maroc</h2>
        </div>
        <div>
          <p>
            Un chantier à équiper, une pièce à rénover ou une installation à
            moderniser ? GO ELEC organise les essentiels de l’électricité par
            familles claires pour les professionnels et les particuliers.
          </p>
          <p>
            Parcourez chaque univers, affinez les caractéristiques techniques et
            préparez une sélection cohérente pour votre projet.
          </p>
          <span><Check size={16} /> Des références contrôlées avant leur mise en ligne</span>
        </div>
      </section>
    </>
  );
}
