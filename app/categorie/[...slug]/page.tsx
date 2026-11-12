import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog-view";
import { getCategories, getCategoryFilters, getProducts } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((item) => item.path === slug.join("/"));
  const emptyDomotique = category && slug[0] === "domotique"
    && (await getProducts({ categoryPath: slug }, categories)).length === 0;
  const path = slug.join("/");
  const seo: Record<string, { title: string; description: string }> = {
    "materiel-electrique": {
      title: "Matériel électrique au Maroc",
      description: "Équipez vos projets avec notre sélection de matériel électrique pour professionnels et particuliers au Maroc chez GO ELEC.",
    },
    "materiel-electrique/disjoncteur-interrupteur": {
      title: "Disjoncteur Hager et Schneider Electric au Maroc",
      description: "Découvrez les disjoncteurs Hager et Schneider Electric chez GO ELEC au Maroc : modèles modulaires, moteurs et différentiels. Comparez les références du catalogue.",
    },
    "cables-fils": {
      title: "Câble électrique et fils au Maroc",
      description: "Découvrez les câbles et fils électriques chez GO ELEC au Maroc : U-1000 R2V, H07V-U et références Nexans. Comparez les sections et conditionnements du catalogue.",
    },
    "gaines-conduits/goulotte": {
      title: "Goulotte électrique perforée Ingelec au Maroc",
      description: "Découvrez les goulottes électriques perforées Ingelec de 2 m chez GO ELEC au Maroc. Comparez les références pour le passage des câbles dans vos coffrets de commande.",
    },
    "appareillage": {
      title: "Appareillage électrique : prises et interrupteurs au Maroc",
      description: "Découvrez l’appareillage électrique LAP chez GO ELEC au Maroc : prises de courant, interrupteurs, poussoirs et cadres des gammes Galaxy, Millenium, Optimo et Aqua.",
    },
    "eclairage/exterieur": {
      title: "Éclairage extérieur au Maroc",
      description: "Découvrez nos solutions d’éclairage extérieur pour vos projets résidentiels et professionnels au Maroc chez GO ELEC.",
    },
    "domotique": {
      title: "Domotique au Maroc",
      description: "Découvrez nos solutions de domotique pour piloter, automatiser et moderniser vos installations au Maroc avec GO ELEC.",
    },
    "eclairage/interieur/douille": {
      title: "Douilles électriques",
      description: "Découvrez notre sélection de douilles électriques pour vos luminaires et installations d’éclairage chez GO ELEC.",
    },
  };
  const optimized = seo[path];
  const fallbackDescription = category
    ? `Découvrez notre sélection ${category.name.toLowerCase()} pour vos projets et installations au Maroc chez GO ELEC.`
    : undefined;
  return {
    title: optimized?.title ?? category?.name ?? "Catégorie",
    description: optimized?.description ?? category?.description ?? fallbackDescription,
    alternates: { canonical: `https://www.goelec.ma/categorie/${slug.map(encodeURIComponent).join("/")}` },
    ...(emptyDomotique ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((item) => item.path === slug.join("/"));
  if (!category) notFound();
  const filterCategory = categories.find((item) => item.path === slug[0]) ?? category;
  const [products, filters] = await Promise.all([getProducts({ categoryPath: slug }, categories), getCategoryFilters(filterCategory.id)]);
  if (category.path === "cables-fils") {
    const family = (familySlug: string) => categories.find((item) => item.parentId === category.id && item.slug === familySlug);
    const u500v = family("cable-u500v"), u500sv = family("cable-u500sv"), ro2v = family("cable-ro2v"), informatique = family("cable-informatique"), incendie = family("cable-incendie");
    const reference = (sku: string) => products.find((item) => item.sku.trim() === sku);
    const metre = reference("10097156"), couronne = reference("10027486"), fil = reference("GS1006");
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.goelec.ma/" },
        { "@type": "ListItem", position: 2, name: category.name, item: `https://www.goelec.ma/categorie/${category.path}` },
      ],
    };
    const content = <div className="category-description">
      <p>Retrouvez nos câbles et fils électriques, dont des références Nexans.{u500v && u500sv && ro2v && <> Les familles <Link className="text-link" href={`/categorie/${u500v.path}`}>{u500v.name}</Link> et <Link className="text-link" href={`/categorie/${u500sv.path}`}>{u500sv.name}</Link> côtoient les références U-1000 R2V, regroupées dans <Link className="text-link" href={`/categorie/${ro2v.path}`}>{ro2v.name}</Link>.</>}{informatique && <> Le catalogue comprend aussi du <Link className="text-link" href={`/categorie/${informatique.path}`}>câble informatique</Link> LANmark-6 U/UTP CAT6</>}{incendie && <>{informatique ? " et une référence " : " Le catalogue comprend une référence "}<Link className="text-link" href={`/categorie/${incendie.path}`}>câble incendie</Link> FIRE ALARM 2XAWG20</>}{(informatique || incendie) && "."}</p>
      <p>Comparez la désignation, la section et le conditionnement indiqués sur chaque fiche.{metre && couronne && <> Les références U-1000 R2V 3G2.5² sont notamment proposées <Link className="text-link" href={`/produit/${metre.slug}`}>au mètre</Link> et <Link className="text-link" href={`/produit/${couronne.slug}`}>en couronne de 50 m</Link>.</>}{fil && <> Le <Link className="text-link" href={`/produit/${fil.slug}`}>fil H07V-U 2,5 mm²</Link> est présenté en 100 m.</>} D’autres fiches précisent leurs longueurs de couronne, bobine ou touret : vérifiez celle de l’article choisi.</p>
    </div>;
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} /><Suspense><CatalogView title="Câbles et fils électriques" categoryContent={content} category={category} categories={categories} products={products} availableFilters={filters} /></Suspense></>;
  }
  if (category.path === "appareillage") {
    const lap = categories.find((item) => item.parentId === category.id && item.slug === "lap");
    const ranges = lap ? categories.filter((item) => item.parentId === lap.id && ["galaxy", "millenium", "optimo", "aqua"].includes(item.slug)) : [];
    const examples = ["20218", "20219", "20955"].flatMap((sku) => {
      const product = products.find((item) => item.sku.trim() === sku);
      return product ? [product] : [];
    });
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.goelec.ma/" },
        { "@type": "ListItem", position: 2, name: category.name, item: `https://www.goelec.ma/categorie/${category.path}` },
      ],
    };
    const content = <div className="category-description">
      <p>Cette sélection d’appareillage électrique réunit des prises de courant, interrupteurs, poussoirs, prises RJ45, RJ12 et télévision, ainsi que des chargeurs USB, variateurs et cadres.{lap && <> Retrouvez la sélection <Link className="text-link" href={`/categorie/${lap.path}`}>LAP</Link>{ranges.length > 0 && <> et ses gammes {ranges.map((item, index) => <span key={item.id}>{index > 0 ? ", " : ""}<Link className="text-link" href={`/categorie/${item.path}`}>{item.name}</Link></span>)}</>}.</>}</p>
      <p>Pour choisir une prise électrique, comparez les modèles 2P, 2P + Terre et les doubles prises 2P + Terre.{examples.length > 0 && <> Quelques exemples : {examples.map((product, index) => <span key={product.id}>{index > 0 ? ", " : ""}<Link className="text-link" href={`/produit/${product.slug}`}>{product.name}</Link></span>)}.</>} Distinguez les prises de courant des prises réseau ou télévision, puis vérifiez la gamme et le type d’appareil indiqués sur chaque fiche.</p>
    </div>;
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} /><Suspense><CatalogView title="Appareillage électrique : interrupteurs et prises" categoryContent={content} category={category} categories={categories} products={products} availableFilters={filters} /></Suspense></>;
  }
  if (category.path === "materiel-electrique/disjoncteur-interrupteur") {
    const parent = categories.find((item) => item.id === category.parentId);
    const brandCategories = categories.filter((item) => item.parentId === category.id && ["hager", "schneider"].includes(item.slug));
    const coffret = categories.find((item) => item.parentId === category.parentId && item.slug === "coffret-electrique");
    const examples = ["MF720", "EZ9P32610", "GS410"].flatMap((sku) => {
      const product = products.find((item) => item.sku.trim() === sku);
      return product ? [product] : [];
    });
    const breadcrumbs = [
      { name: "Accueil", url: "https://www.goelec.ma/" },
      ...(parent ? [{ name: parent.name, url: `https://www.goelec.ma/categorie/${parent.path}` }] : []),
      { name: category.name, url: `https://www.goelec.ma/categorie/${category.path}` },
    ];
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
    };
    const content = <div className="category-description">
      <p>Découvrez nos disjoncteurs Hager et Schneider Electric : modèles modulaires Easy9 et Acti9 iC40, disjoncteurs moteurs TeSys GV2ME, disjoncteurs EasyPact et disjoncteurs différentiels de branchement Gardy. Cette catégorie comprend aussi des interrupteurs différentiels, à distinguer des disjoncteurs lors de votre recherche.</p>
      <p>Comparez le type d’appareil, le calibre et la configuration indiqués sur chaque fiche : les références Hager proposées comprennent notamment des modèles Ph+N 230 V de 10 A à 32 A.{brandCategories.length > 0 && <> Parcourez les sélections {brandCategories.map((item, index) => <span key={item.id}>{index > 0 ? " et " : ""}<Link className="text-link" href={`/categorie/${item.path}`}>{item.name}</Link></span>)}.</>}{examples.length > 0 && <> Quelques références à consulter : {examples.map((product, index) => <span key={product.id}>{index > 0 ? ", " : ""}<Link className="text-link" href={`/produit/${product.slug}`}>{product.sku.trim()}</Link></span>)}.</>}{coffret && <> Pour les enveloppes de tableau, consultez nos <Link className="text-link" href={`/categorie/${coffret.path}`}>coffrets électriques</Link>.</>}{parent && <> Retrouvez l’ensemble du <Link className="text-link" href={`/categorie/${parent.path}`}>matériel électrique</Link>.</>}</p>
    </div>;
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} /><Suspense><CatalogView title="Disjoncteurs et interrupteurs différentiels" categoryContent={content} category={category} categories={categories} products={products} availableFilters={filters} /></Suspense></>;
  }
  if (category.path === "gaines-conduits/goulotte") {
    const parent = categories.find((item) => item.id === category.parentId);
    const breadcrumbs = [
      { name: "Accueil", url: "https://www.goelec.ma/" },
      ...(parent ? [{ name: parent.name, url: `https://www.goelec.ma/categorie/${parent.path}` }] : []),
      { name: category.name, url: `https://www.goelec.ma/categorie/${category.path}` },
    ];
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
    };
    const content = <div className="category-description">
      <p>Retrouvez nos goulottes électriques perforées Ingelec de 2 m. Avec leur couvercle, elles permettent de guider les conducteurs isolés ou les câbles dans un coffret de commande et d’assurer leur protection mécanique.</p>
      <p>Pour choisir votre goulotte, comparez les références disponibles{products.length > 0 && <> : {products.map((product, index) => <span key={product.id}>{index > 0 ? ", " : ""}<Link className="text-link" href={`/produit/${product.slug}`}>{product.sku || product.name}</Link></span>)}</>}. Consultez chaque fiche produit et vérifiez l’espace disponible dans votre coffret avant de choisir.{parent && <> Retrouvez les autres solutions de cheminement dans notre catégorie <Link className="text-link" href={`/categorie/${parent.path}`}>{parent.name}</Link>.</>}</p>
    </div>;
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }} /><Suspense><CatalogView title="Goulotte électrique" categoryContent={content} category={category} categories={categories} products={products} availableFilters={filters} /></Suspense></>;
  }
  return <Suspense><CatalogView category={category} categories={categories} products={products} availableFilters={filters} /></Suspense>;
}
