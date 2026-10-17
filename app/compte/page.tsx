import Link from 'next/link';
import { MapPin, Package, ShieldCheck, UserRound } from 'lucide-react';
import { StoreText } from '@/components/storefront-language';
import { signOut } from '@/app/auth/actions';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAdminRole } from '@/lib/auth-routing';
import { CustomerPasswordForm } from './password-form';
import styles from './account.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon compte' };
const statuses: Record<string,string> = {pending:'En attente',confirmed:'Confirmée',processing:'En préparation',shipped:'Expédiée',delivered:'Livrée',cancelled:'Annulée',refunded:'Remboursée'};
export default async function Page({searchParams}: {searchParams: Promise<{page?:string}>}) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const {data:profile} = await supabase.from('profiles').select('*').eq('id',user.id).single();
  if (isAdminRole(profile?.role)) redirect('/admin');
  const requestedPage = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= 10000 ? requestedPage : 1;
  const [{data:orders,count,error:ordersError},{data:addresses,error:addressesError}] = await Promise.all([
    supabase.from('orders').select('id,order_number,status,grand_total,currency,created_at',{count:'exact'}).eq('user_id',user.id).order('created_at',{ascending:false}).range((page-1)*10,page*10-1),
    supabase.from('addresses').select('*').eq('user_id',user.id).order('created_at'),
  ]);
  const name = [profile?.first_name,profile?.last_name].filter(Boolean).join(' ');
  return <section className={`wrap ${styles.page}`}>
    <header className={styles.welcome}>
      <div><span className="eyebrow"><StoreText>MON ESPACE</StoreText></span><h1><StoreText>Bonjour</StoreText>{name ? ` ${name}` : ''}</h1><p dir="auto">{user.email}</p></div>
      <form action={signOut}><button className="button navy"><StoreText>Se déconnecter</StoreText></button></form>
    </header>
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.wide}`} aria-labelledby="account-information"><h2 id="account-information"><UserRound size={22} aria-hidden="true"/><StoreText>Mes informations</StoreText></h2>
        <dl className={styles.details}><div><dt><StoreText>Nom</StoreText></dt><dd>{name || '—'}</dd></div><div><dt><StoreText>Email</StoreText></dt><dd dir="auto">{user.email}</dd></div>{profile?.phone && <div><dt><StoreText>Téléphone</StoreText></dt><dd dir="auto">{profile.phone}</dd></div>}</dl>
      </section>
      <section className={`${styles.card} ${styles.wide}`} aria-labelledby="account-orders" id="commandes"><h2 id="account-orders"><Package size={22} aria-hidden="true"/><StoreText>Mes commandes</StoreText></h2>
        {ordersError ? <p className={styles.empty}><StoreText>Impossible de charger vos commandes. Réessayez dans quelques instants.</StoreText></p> : orders?.length ? <div className={styles.orders}>{orders.map(order => <article className={styles.order} key={String(order.id)}>
          <strong>{String(order.order_number)}</strong><time dateTime={String(order.created_at)}>{new Intl.DateTimeFormat('fr-MA',{day:'2-digit',month:'short',year:'numeric',timeZone:'Africa/Casablanca'}).format(new Date(String(order.created_at)))}</time>
          <span className={styles.status}><StoreText>{statuses[String(order.status)] ?? String(order.status)}</StoreText></span><b dir="ltr">{new Intl.NumberFormat('fr-MA',{style:'currency',currency:String(order.currency)}).format(Number(order.grand_total))}</b>
        </article>)}</div> : <p className={styles.empty}><StoreText>Aucune commande pour le moment.</StoreText></p>}
        {page > 1 && <Link className={styles.more} href={`/compte?page=${page-1}#commandes`}><StoreText>Commandes précédentes</StoreText></Link>}
        {count !== null && count > page*10 && <Link className={styles.more} href={`/compte?page=${page+1}#commandes`}><StoreText>Voir les commandes suivantes</StoreText></Link>}
      </section>
      <section className={styles.card} aria-labelledby="account-addresses"><h2 id="account-addresses"><MapPin size={22} aria-hidden="true"/><StoreText>Mes adresses</StoreText></h2>
        {addressesError ? <p className={styles.empty}><StoreText>Impossible de charger vos adresses. Réessayez dans quelques instants.</StoreText></p> : addresses?.length ? addresses.map(address => <address className={styles.address} key={String(address.id)}>
          <strong>{String(address.label || 'Adresse')}</strong><p>{[address.first_name,address.last_name].filter(Boolean).join(' ')}</p>{Boolean(address.company) && <div>{String(address.company)}</div>}<div>{String(address.address_line_1)}</div>{Boolean(address.address_line_2) && <div>{String(address.address_line_2)}</div>}<div>{[address.postal_code,address.city,address.region].filter(Boolean).join(' ')}</div><div>{String(address.country)}</div>{Boolean(address.phone) && <div dir="auto">{String(address.phone)}</div>}
          <div className={styles.tags}>{Boolean(address.is_default_shipping) && <span className={styles.status}><StoreText>Livraison par défaut</StoreText></span>}{Boolean(address.is_default_billing) && <span className={styles.status}><StoreText>Facturation par défaut</StoreText></span>}</div>
        </address>) : <p className={styles.empty}><StoreText>Aucune adresse enregistrée.</StoreText></p>}
      </section>
      <section className={styles.card} aria-labelledby="account-security"><h2 id="account-security"><ShieldCheck size={22} aria-hidden="true"/><StoreText>Changer le mot de passe</StoreText></h2><CustomerPasswordForm/></section>
    </div>
  </section>;
}
