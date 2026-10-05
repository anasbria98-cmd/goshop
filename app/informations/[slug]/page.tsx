import Link from "next/link";
import { notFound } from "next/navigation";
import { information } from "@/data/information";
export function generateStaticParams() {
  return Object.keys(information).map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: information[slug]?.title || "Informations" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const info = information[slug];
  if (!info) notFound();
  return (
    <section className="wrap information-page">
      <div className="breadcrumbs">
        <Link href="/">Accueil</Link>
        <span>/</span>
        {info.title}
      </div>
      <h1>{info.title}</h1>
      {info.body.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <Link href="/" className="text-link">
        Retour à la boutique
      </Link>
    </section>
  );
}
