import { Home } from "@/components/home";
import { getHomepageData } from "@/lib/catalog";
import { getHomeSlides } from "@/lib/home-slides-server";
import type { Metadata } from "next";

const seoTitle = "GO ELEC | Matériel électrique informatique et systèmes de sécurité";
const seoDescription = "Votre sélection de matériel électrique informatique, systèmes de sécurité et outillage au Maroc. Découvrez les grandes marques et préparez vos projets avec GO ELEC.";

export const metadata: Metadata = {
  title: { absolute: seoTitle },
  description: seoDescription,
  openGraph: { title: seoTitle, description: seoDescription },
  twitter: { title: seoTitle, description: seoDescription },
};

export const dynamic = "force-dynamic";
export default async function Page() {
  const data = await getHomepageData();
  return <Home {...data} slides={await getHomeSlides(data.categories)} />;
}
