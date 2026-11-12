import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog-view";
import { getCategories, getCategoryFilters, getProducts } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.path === slug.join("/"));
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
      title: "Câble électrique au Maroc",
      description: "Découvrez notre sélection de câbles et fils électriques pour vos installations et chantiers au Maroc chez GO ELEC.",
    },
    "gaines-conduits/goulotte": {
      title: "Goulotte électrique perforée Ingelec au Maroc",
      description: "Découvrez les goulottes électriques perforées Ingelec de 2 m chez GO ELEC au Maroc. Comparez les références pour le passage des câbles dans vos coffrets de commande.",
    },
    "appareillage": {
      title: "Appareillage électrique au Maroc",
      description: "Découvrez notre sélection d’appareillage électrique pour équiper vos installations résidentielles et professionnelles au Maroc.",
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
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((item) => item.path === slug.join("/"));
  if (!category) notFound();
  const filterCategory = categories.find((item) => item.path === slug[0]) ?? category;
  const [products, filters] = await Promise.all([getProducts({ categoryPath: slug }, categories), getCategoryFilters(filterCategory.id)]);
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
