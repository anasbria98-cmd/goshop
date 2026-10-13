import Link from "next/link";
import { ArrowRight, BadgePercent, Banknote, Boxes, MessageSquareText, Package, PackagePlus, ShoppingBag, UserRound, Warehouse } from "lucide-react";
import { EmptyState, PanelHeader, Status } from "./_components";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { money } from "@/lib/catalog-model";

type RecentProduct = { id: string; name: string; sku: string; price: number; status: string; created_at: string };
type RecentReview = { id: string; rating: number; title: string | null; status: string; created_at: string; products: { name: string } | null };

export default async function AdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const [orders, products, customers, inventory, recentOrders, promotions, pendingReviews, recentProducts, recentReviews] = await Promise.all([
    supabase.from("orders").select("grand_total,status,payment_status,created_at", { count: "exact" }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("inventory").select("id,quantity,reserved_quantity,low_stock_threshold,products(id,name,sku)").order("updated_at", { ascending: false }),
    supabase.from("orders").select("id,order_number,email,status,payment_status,grand_total,created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("promotions").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("products").select("id,name,sku,price,status,created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("reviews").select("id,rating,title,status,created_at,products(name)").order("created_at", { ascending: false }).limit(5),
  ]);

  const orderRows = orders.data ?? [];
  const paidOrders = orderRows.filter((order) => order.payment_status === "paid" && !["cancelled", "refunded"].includes(order.status));
  const pendingOrderCount = orderRows.filter((order) => ["pending", "confirmed", "processing"].includes(order.status)).length;
  const totalSales = paidOrders.reduce((sum, order) => sum + Number(order.grand_total), 0);
  const inventoryRows = inventory.data ?? [];
  const lowStockRows = inventoryRows.filter((item) => item.quantity - item.reserved_quantity <= item.low_stock_threshold);
  const cards = [
    { label: "Chiffre d’affaires", value: money(totalSales), detail: "Commandes payées, hors annulations", Icon: Banknote, tone: "blue" },
    { label: "Commandes", value: orders.count ?? 0, detail: `${pendingOrderCount} à traiter`, Icon: ShoppingBag, tone: "teal" },
    { label: "Produits", value: products.count ?? 0, detail: "Dans votre catalogue", Icon: Package, tone: "navy" },
    { label: "Clients", value: customers.count ?? 0, detail: "Comptes clients enregistrés", Icon: UserRound, tone: "violet" },
  ];
  const now = new Date();
  const salesSeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const monthOrders = orderRows.filter((order) => {
      const created = new Date(order.created_at);
      return created.getFullYear() === date.getFullYear() && created.getMonth() === date.getMonth();
    });
    return {
      label: new Intl.DateTimeFormat("fr-MA", { month: "short" }).format(date),
      sales: monthOrders.filter((order) => order.payment_status === "paid" && !["cancelled", "refunded"].includes(order.status)).reduce((sum, order) => sum + Number(order.grand_total), 0),
      orders: monthOrders.length,
    };
  });
  const maxSales = Math.max(...salesSeries.map((item) => item.sales), 1);
  const maxOrders = Math.max(...salesSeries.map((item) => item.orders), 1);
  const chartPoints = (key: "sales" | "orders", max: number) => salesSeries.map((item, index) => `${index * 20},${92 - (item[key] / max) * 74}`).join(" ");

  return (
    <>
      <section className="admin-dashboard-hero">
        <div><h1>Votre boutique en un coup d’œil</h1><p>Les chiffres essentiels et les prochaines actions pour GO ELEC.</p></div>
        <Link className="admin-primary" href="/admin/products/new"><PackagePlus size={17} /> Ajouter un produit</Link>
      </section>
      <div className="admin-stats admin-stats--visual">
        {cards.map(({ label, value, detail, Icon, tone }) => <article className={`admin-stat-card admin-stat-card--${tone}`} key={label}><span className="admin-stat-icon"><Icon aria-hidden="true" size={19} /></span><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </div>
      <div className="admin-dashboard-layout">
        <section className="admin-panel admin-sales-analytics">
          <PanelHeader title="Activité commerciale" description="Ventes et commandes des six derniers mois" />
          {orderRows.length ? <div className="admin-chart-wrap">
            <div className="admin-chart-legend"><span><i className="is-sales" /> Chiffre d’affaires</span><span><i className="is-orders" /> Commandes</span><strong>{money(totalSales)} encaissés</strong></div>
            <svg className="admin-sales-chart" viewBox="0 0 100 112" preserveAspectRatio="none" role="img" aria-label="Évolution des ventes et commandes sur six mois">
              <defs><linearGradient id="admin-sales-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2b76c5" stopOpacity=".22" /><stop offset="1" stopColor="#2b76c5" stopOpacity="0" /></linearGradient></defs>
              {[18, 42, 66, 90].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="admin-chart-gridline" />)}
              <polygon points={`0,92 ${chartPoints("sales", maxSales)} 100,92`} fill="url(#admin-sales-area)" />
              <polyline points={chartPoints("sales", maxSales)} className="admin-chart-line is-sales" />
              <polyline points={chartPoints("orders", maxOrders)} className="admin-chart-line is-orders" />
            </svg>
            <div className="admin-chart-labels">{salesSeries.map((item) => <span key={item.label}>{item.label}</span>)}</div>
          </div> : <EmptyState title="Pas encore de données de vente">Le graphique apparaîtra dès la première commande.</EmptyState>}
        </section>
        <section className="admin-panel admin-panel--flush admin-dashboard-orders">
          <PanelHeader title="Commandes récentes" description="Les dernières commandes enregistrées" count={recentOrders.data?.length ?? 0} />
          {recentOrders.data?.length ? <div className="admin-table-wrap"><table><thead><tr><th>Commande</th><th>Client</th><th>Statut</th><th>Total</th><th>Date</th></tr></thead><tbody>{recentOrders.data.map((order) => <tr key={order.id}><td data-label="Commande"><Link href={`/admin/orders/${order.id}`} className="admin-table-link">{order.order_number}</Link></td><td data-label="Client">{order.email}</td><td data-label="Statut"><Status>{order.status}</Status></td><td data-label="Total"><strong>{money(Number(order.grand_total))}</strong></td><td data-label="Date">{new Date(order.created_at).toLocaleDateString("fr-MA")}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucune commande">Les nouvelles commandes apparaîtront ici.</EmptyState>}
          <Link className="admin-panel-link" href="/admin/orders">Toutes les commandes <ArrowRight size={14} /></Link>
        </section>
        <section className="admin-panel admin-quick-actions">
          <PanelHeader title="À suivre aujourd’hui" description="Les priorités de votre boutique" />
          <div className="admin-priority-list">
            <Link href="/admin/orders"><span><Boxes size={18} /></span><span><strong>Commandes à traiter</strong><small>Préparation et suivi</small></span><b>{pendingOrderCount}</b></Link>
            <Link href="/admin/inventory?filter=low"><span><Warehouse size={18} /></span><span><strong>Alertes de stock</strong><small>Vérifier les disponibilités</small></span><b>{lowStockRows.length}</b></Link>
            <Link href="/admin/promotions"><span><BadgePercent size={18} /></span><span><strong>Promotions actives</strong><small>Gérer vos offres</small></span><b>{promotions.count ?? 0}</b></Link>
          </div>
          <Link href="/admin/products/new" className="admin-summary-action">Ajouter un produit <ArrowRight size={15} /></Link>
        </section>
        <section className="admin-panel admin-dashboard-card admin-dashboard-stock">
          <PanelHeader title="Stock à surveiller" description="Produits proches de la rupture" count={lowStockRows.length} />
          {lowStockRows.length ? <div className="admin-compact-list">{lowStockRows.slice(0, 6).map((item) => { const product = item.products as unknown as { id: string; name: string; sku: string } | null; const available = item.quantity - item.reserved_quantity; return <Link href="/admin/inventory?filter=low" key={item.id}><span><strong>{product?.name ?? "Produit"}</strong><small>{product?.sku ?? "Sans SKU"}</small></span><span className="admin-list-value"><strong>{available}</strong><Status>{available <= 0 ? "Rupture" : "Faible"}</Status></span></Link>; })}</div> : <EmptyState title="Stocks maîtrisés">Aucune alerte de stock actuellement.</EmptyState>}
        </section>
        <section className="admin-panel admin-panel--flush admin-dashboard-products">
          <div className="admin-table-heading"><PanelHeader title="Produits récents" description="Vos dernières fiches, prêtes à être gérées" count={recentProducts.data?.length ?? 0} /><Link className="admin-secondary" href="/admin/products">Voir le catalogue <ArrowRight size={14} /></Link></div>
          {recentProducts.data?.length ? <div className="admin-table-wrap"><table><thead><tr><th>Produit</th><th>Référence</th><th>Prix</th><th>Statut</th><th>Création</th><th><span className="admin-sr-only">Action</span></th></tr></thead><tbody>{(recentProducts.data as RecentProduct[]).map((product) => <tr key={product.id}><td data-label="Produit"><Link className="admin-product-cell" href={`/admin/products/${product.id}`}><span className="admin-product-placeholder"><Package size={19} /></span><strong>{product.name}</strong></Link></td><td data-label="Référence"><code>{product.sku}</code></td><td data-label="Prix"><strong>{money(Number(product.price))}</strong></td><td data-label="Statut"><Status>{product.status}</Status></td><td data-label="Création">{new Date(product.created_at).toLocaleDateString("fr-MA")}</td><td data-label="Action"><Link className="admin-table-link" href={`/admin/products/${product.id}`}>Modifier <ArrowRight size={13} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="Votre catalogue commence ici" actionHref="/admin/products/new" actionLabel="Ajouter un produit">Ajoutez votre première fiche pour retrouver vos produits dans cet espace.</EmptyState>}
        </section>
        <section className="admin-panel admin-dashboard-card admin-dashboard-reviews">
          <PanelHeader title="Avis récents" description={`${pendingReviews.count ?? 0} en attente de modération`} count={recentReviews.data?.length ?? 0} />
          {recentReviews.data?.length ? <div className="admin-review-list">{(recentReviews.data as unknown as RecentReview[]).map((review) => <Link href="/admin/reviews" key={review.id}><span className="admin-rating" aria-label={`${review.rating} sur 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><span><strong>{review.title || review.products?.name || "Avis client"}</strong><small>{review.products?.name ?? "Produit"} · {new Date(review.created_at).toLocaleDateString("fr-MA")}</small></span><Status>{review.status}</Status></Link>)}</div> : <EmptyState title="Aucun avis"><MessageSquareText size={18} /> Les avis clients apparaîtront ici.</EmptyState>}
        </section>
      </div>
    </>
  );
}
