import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Phone, Check } from 'lucide-react';
import { getCategories } from '@/lib/catalog';
import { QuoteRequestForm } from './quote-request-form';
import styles from './quote-request.module.css';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = {title: 'Demander un devis', description: 'Décrivez votre projet et demandez un devis personnalisé à GO ELEC.'};
export default async function QuoteRequestPage() {
  await requireUser('/demander-un-devis');
  const categories = await getCategories();
  const byId = new Map(categories.map(c => [c.id, c]));
  const label = (id: string, seen = new Set<string>()): string => {
    const category = byId.get(id);
    if (!category || seen.has(id)) return '';
    seen.add(id);
    const parent = category.parentId ? label(category.parentId, seen) : '';
    return [parent, category.name].filter(Boolean).join(' › ');
  };
  return <div className={`wrap ${styles.page}`}>
    <nav className={styles.breadcrumb} aria-label="Fil d’Ariane"><Link href="/">Accueil</Link><span aria-hidden="true">/</span><span>Demander un devis</span></nav>
    <header className={styles.intro}><span className={styles.eyebrow}>VOTRE PROJET, NOTRE EXPERTISE</span><h1>Demander un devis</h1><p>Parlez-nous de votre besoin. Notre équipe vous accompagne dans le choix du matériel adapté à votre projet.</p></header>
    <div className={styles.layout}>
      <section className={styles.formCard} aria-labelledby="quote-form-title"><div className={styles.cardHeading}><FileText size={22} aria-hidden="true"/><div><h2 id="quote-form-title">Votre demande</h2><p>Les champs marqués d’un * sont obligatoires.</p></div></div><QuoteRequestForm categories={categories.map(c => ({id: c.id, label: label(c.id)}))}/></section>
      <aside className={styles.aside}><span className={styles.asideIcon}><FileText size={28} aria-hidden="true"/></span><h2>Un devis adapté à votre projet</h2><p>Quelques précisions nous aideront à comprendre votre demande.</p><ul>{['Indiquez les références et quantités souhaitées.', 'Décrivez votre installation ou votre projet.', 'Ajoutez des photos ou un document si nécessaire.'].map(t => <li key={t}><Check size={18} aria-hidden="true"/><span>{t}</span></li>)}</ul><div className={styles.contact}><h3>Besoin d’échanger avec nous ?</h3><a href="tel:+212522900590"><Phone size={18} aria-hidden="true"/>05 22 90 05 90</a><a href="mailto:contact@goelec.ma">contact@goelec.ma</a></div><p className={styles.privacy}>Vos informations sont utilisées uniquement pour traiter votre demande. <Link href="/informations/confidentialite">Confidentialité</Link></p></aside>
    </div>
  </div>;
}
