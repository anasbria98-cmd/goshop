export default function Loading() {
  return <div className="admin-page" role="status" aria-busy="true"><p>Chargement de votre espace…</p><div className="route-loading-grid" aria-hidden="true">{[0, 1, 2].map((key) => <div className="route-loading-block" key={key} />)}</div></div>;
}
