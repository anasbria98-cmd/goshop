import Link from "next/link";
import Image from "next/image";
import {
  Truck,
  ShieldCheck,
  BadgePercent,
  PackageCheck,
  Headphones,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";
import { categories, products } from "@/data/catalog";
import { ProductSection } from "./product-section";
import { ProductCard } from "./product-card";
export function Benefits() {
  return (
    <div className="benefits wrap">
      {[
        [
          Truck,
          "Livraison partout au Maroc",
          "À domicile ou sur votre chantier",
        ],
        [PackageCheck, "Les grandes marques", "Le choix de la qualité"],
        [BadgePercent, "Des prix justes", "Pour tous vos projets"],
        [Headphones, "À votre écoute", "Un conseil, un projet ?"],
      ].map(([Icon, title, text]) => {
        const I = Icon as typeof Truck;
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
            <span className="hero-kicker">BIEN ÉQUIPÉ. AU MEILLEUR PRIX.</span>
            <h1>
              Vos projets électriques,
              <br />
              <em>notre spécialité.</em>
            </h1>
            <p>
              Les grandes marques, les bons produits.
              <br />
              Tout pour vos installations au Maroc.
            </p>
            <Link
              className="button orange"
              href="/categorie/materiel-electrique"
            >
              Découvrir nos produits
            </Link>
            <div className="hero-proof">
              <ShieldCheck size={17} /> Des équipements fiables pour chaque
              projet
            </div>
          </div>
          <div className="hero-products">
            <span className="hero-brand">
              Schneider<span>Electric</span>
            </span>
            <Image
              className="hero-panel"
              src="/products/panel.webp"
              width={340}
              height={310}
              alt="Coffret de distribution électrique"
              loading="eager"
              priority
            />
            <Image
              className="hero-breaker"
              src="/products/breaker.webp"
              width={220}
              height={250}
              alt="Disjoncteur modulaire"
              loading="eager"
              priority
            />
            <div className="hero-price">
              À partir de
              <strong>
                69<small> DH</small>
              </strong>
            </div>
          </div>
          <div className="hero-caption">LA SÉLECTION MATÉRIEL ÉLECTRIQUE</div>
        </div>
        <aside className="secondary-promo">
          <span className="promo-label">L’ÉCLAIRAGE QUI CHANGE TOUT</span>
          <h2>
            Passez à la LED.
            <br />
            Économisez au quotidien.
          </h2>
          <p>
            Des idées lumineuses,
            <br />
            des prix tout aussi brillants.
          </p>
          <Image
            src="/products/bulb.webp"
            width={190}
            height={200}
            alt="Ampoule LED"
          />
          <span className="secondary-price">
            Dès <strong>29 DH</strong>
          </span>
          <Link href="/categorie/eclairage">Voir la sélection LED</Link>
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
        <h2>Catégories principales</h2>
        <Link href="/recherche">Explorer le catalogue</Link>
      </div>
      <div className="category-grid">
        {categories
          .filter((_, i) => [0, 1, 2, 3, 4, 7].includes(i))
          .map((c) => (
            <Link
              className="category-card"
              href={`/categorie/${c.slug}`}
              key={c.slug}
            >
              <div>
                <Image
                  src={`/products/${c.image}.webp`}
                  width={160}
                  height={120}
                  alt=""
                />
              </div>
              <strong>{c.short}</strong>
              <span>Découvrir</span>
            </Link>
          ))}
      </div>
    </section>
  );
}
export function PhilipsCampaign() {
  const philips = products.filter((product) => product.brand === "Philips");

  return (
    <section className="campaign campaign-philips wrap">
      <div className="campaign-story philips-story">
        <span className="campaign-brand">PHILIPS</span>
        <div className="campaign-copy">
          <span className="campaign-kicker">LUMIÈRE SUR VOS PROJETS</span>
          <h2>Une belle lumière change toute la pièce.</h2>
          <p>
            Une sélection LED efficace, chaleureuse et pensée pour durer.
          </p>
          <div className="campaign-offer">
            <strong>-20%</strong>
            <span>sur la sélection éclairage</span>
          </div>
          <Link className="button white" href="/categorie/eclairage">
            Voir tout l’éclairage <ArrowRight size={16} />
          </Link>
        </div>
        <Image
          className="campaign-hero-product"
          src="/products/bulb.webp"
          width={330}
          height={330}
          alt="Ampoule LED Philips"
        />
        <span className="light-orbit" aria-hidden="true" />
      </div>
      <div className="campaign-shelf">
        <div className="campaign-shelf-heading">
          <div>
            <span>OFFRE SPÉCIALE</span>
            <h3>Les essentiels Philips</h3>
          </div>
          <Link href="/recherche?q=Philips">Toute la marque</Link>
        </div>
        <div className="campaign-product-grid philips-products">
          {philips.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function OctoberCampaign() {
  const selection = [products[1], products[0], products[8], products[2]];

  return (
    <section className="campaign campaign-october wrap">
      <div className="campaign-story october-story">
        <span className="month-chip">SÉLECTION OCTOBRE</span>
        <div className="campaign-copy">
          <span className="campaign-kicker">LE CHANTIER DU MOIS</span>
          <h2>Tout ce qu’il faut pour une installation bien pensée.</h2>
          <p>
            Protection, appareillage et coffrets : une sélection claire pour
            avancer sans perdre de temps.
          </p>
          <ul className="project-points">
            <li><b>01</b> Choisir</li>
            <li><b>02</b> Équiper</li>
            <li><b>03</b> Installer</li>
          </ul>
          <Link className="button white" href="/categorie/materiel-electrique">
            Voir la sélection <ArrowRight size={16} />
          </Link>
        </div>
        <div className="october-visual" aria-hidden="true">
          <Zap size={38} fill="currentColor" />
          <span>GO</span>
        </div>
      </div>
      <div className="campaign-shelf">
        <div className="campaign-shelf-heading">
          <div>
            <span>PRÊT POUR LE CHANTIER</span>
            <h3>La sélection de nos experts</h3>
          </div>
          <Link href="/recherche">Voir le catalogue</Link>
        </div>
        <div className="campaign-product-grid october-products">
          {selection.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
export function Home() {
  return (
    <>
      <Hero />
      <CategorySection />
      <ProductSection
        title="Nos meilleures ventes"
        eyebrow="LES ESSENTIELS DE VOS CHANTIERS"
        products={products.slice(0, 6)}
      />
      <PhilipsCampaign />
      <OctoberCampaign />
      <ProductSection
        title="Les bons plans du moment"
        eyebrow="BIEN S’ÉQUIPER, MOINS DÉPENSER"
        products={products.filter((p) => p.oldPrice)}
        href="/recherche?promo=1"
        id="promotions"
      />
      <section className="connected-promo wrap">
        <div>
          <span className="eyebrow">UNE MAISON PLUS INTELLIGENTE</span>
          <h2>Le confort connecté, tout simplement.</h2>
          <p>Commandez, programmez et simplifiez votre quotidien.</p>
        </div>
        <Image
          className="connected-image"
          src="/products/socket.webp"
          width={100}
          height={100}
          alt="Prise pour la maison"
        />
        <Link className="button navy" href="/categorie/domotique">
          Découvrir la domotique
        </Link>
      </section>
      <ProductSection
        title="Nouveautés"
        products={products.filter((p) => p.fresh)}
        href="/recherche?nouveau=1"
      />
      <section className="brands wrap">
        <div className="section-heading">
          <h2>Les marques qui font la différence</h2>
          <Link href="/recherche">Toutes nos marques</Link>
        </div>
        <div className="brand-list">
          {[
            "Schneider Electric",
            "legrand",
            "hager",
            "SIEMENS",
            "PHILIPS",
            "WAGO",
          ].map((b) => (
            <Link
              href={`/recherche?q=${encodeURIComponent(b.split(" ")[0])}`}
              key={b}
              className={`brand-logo brand-${b.split(" ")[0].toLowerCase()}`}
            >
              {b}
            </Link>
          ))}
        </div>
      </section>
      <ProductSection
        title="Notre sélection pour vos projets"
        products={[
          products[8],
          products[5],
          products[6],
          products[7],
          products[4],
          products[2],
        ]}
      />
      <section className="seo wrap">
        <div>
          <span className="eyebrow">LE BON MATÉRIEL. LE BON PARTENAIRE.</span>
          <h2>
            Goshop.ma, votre spécialiste
            <br />
            du matériel électrique au Maroc
          </h2>
        </div>
        <div>
          <p>
            Un chantier à équiper, une pièce à rénover ou une installation à
            moderniser ? Goshop.ma réunit les essentiels de l’électricité pour
            les professionnels et les particuliers : protection électrique,
            prises et interrupteurs, câbles, éclairage et solutions connectées.
          </p>
          <p>
            Comparez les références, préparez votre sélection et trouvez le
            matériel adapté à votre projet. Notre ambition : rendre les
            équipements électriques de qualité plus accessibles, partout au
            Maroc.
          </p>
          <span>
            <Check size={16} /> Des produits sélectionnés pour vos installations
          </span>
        </div>
      </section>
    </>
  );
}
