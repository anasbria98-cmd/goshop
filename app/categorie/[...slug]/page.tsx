import { Suspense } from "react";
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
    "cables-fils": {
      title: "Câble électrique au Maroc",
      description: "Découvrez notre sélection de câbles et fils électriques pour vos installations et chantiers au Maroc chez GO ELEC.",
    },
    "gaines-conduits/goulotte": {
      title: "Goulotte électrique au Maroc",
      description: "Découvrez nos goulottes électriques pour organiser et protéger vos câbles dans vos installations au Maroc.",
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
  return {
    title: optimized?.title ?? category?.name ?? "Catégorie",
    description: optimized?.description ?? category?.description ?? undefined,
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
  return <Suspense><CatalogView category={category} categories={categories} products={products} availableFilters={filters} /></Suspense>;
}
