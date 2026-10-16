"use client";

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog-model';
import type { ProductReview } from '@/lib/product-reviews';
import { loadRecentProducts, submitProductReview } from '@/app/produit/actions';
import { productShareLinks, recentProductIds, rememberProduct, RECENT_PRODUCTS_KEY } from '@/lib/product-page-model';
import { ProductCard } from './product-card';
import './product-page-extras.css';

export function ProductShare({ name }: { name: string }) {
  const [message, setMessage] = useState('');
  async function shareInstagram() {
    setMessage('');
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: name, text: name, url }); }
      catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setMessage('Partage indisponible. Vous pouvez copier le lien ci-dessous.'); }
      return;
    }
    await copyUrl();
  }
  async function copyUrl() {
    try { await navigator.clipboard.writeText(window.location.href); setMessage('Lien copié'); }
    catch { setMessage(`Copiez ce lien : ${window.location.href}`); }
  }
  function social(network: 'facebook' | 'whatsapp') {
    const links = productShareLinks(window.location.href, name);
    window.open(links[network], '_blank', 'noopener,noreferrer');
  }
  return <section className="product-share" aria-labelledby="product-share-title">
    <h2 id="product-share-title">Partagez ce produit</h2>
    <div className="product-share-buttons">
      <button type="button" onClick={() => social('facebook')} aria-label="Partager sur Facebook"><Facebook size={18} />Facebook</button>
      <button type="button" onClick={shareInstagram} aria-label="Partager via Instagram ou copier le lien"><Instagram size={18} />Instagram</button>
      <button type="button" onClick={() => social('whatsapp')} aria-label="Partager sur WhatsApp"><MessageCircle size={18} />WhatsApp</button>
    </div>
    {message && <div className="product-share-status" role="status">{message}{message.startsWith('Partage indisponible') && <button type="button" onClick={copyUrl}>Copier le lien</button>}</div>}
  </section>;
}

export function ProductReviews({ productId, slug, reviews, unavailable, customerName }: { productId: string; slug: string; reviews: ProductReview[]; unavailable: boolean; customerName?: string | null }) {
  const [state, action, pending] = useActionState(submitProductReview, { message: '' });
  return <section className="product-reviews" aria-labelledby="product-reviews-title">
    <h2 id="product-reviews-title">Commentaires des clients</h2>
    {unavailable ? <p role="status">Les commentaires sont temporairement indisponibles.</p> : !reviews.length ? <p>Aucun commentaire pour le moment. Soyez le premier à donner votre avis.</p> : <div className="product-review-list">{reviews.map((review) => <article key={review.id}>
      <div className="product-review-heading"><strong>{review.name}</strong><time dateTime={review.date}>{new Date(review.date).toLocaleDateString('fr-MA', { timeZone: 'UTC' })}</time></div>
      <span className="product-review-stars" aria-label={`${review.rating} sur 5`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
      {review.content && <p>{review.content}</p>}
    </article>)}</div>}
    {customerName ? <form action={action} className="product-review-form">
      <h3>Donnez votre avis</h3>
      <input type="hidden" name="productId" value={productId} />
      <label>Nom<input value={customerName} readOnly aria-describedby="review-name-note" /></label>
      <small id="review-name-note">Le nom de votre compte sera affiché avec votre avis.</small>
      <label>Note<select name="rating" required defaultValue=""><option value="" disabled>Choisir une note</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
      <label>Commentaire<textarea name="content" required minLength={3} maxLength={3000} rows={4} /></label>
      <small>Les commentaires sont publiés après validation par GO ELEC.</small>
      <button className="button" disabled={pending || state.success}>{pending ? 'Envoi en cours…' : 'Envoyer mon avis'}</button>
      <p role="status">{state.message}</p>
    </form> : <p><Link href={`/auth/sign-in?next=${encodeURIComponent(`/produit/${slug}`)}`}>Connectez-vous</Link> pour laisser un commentaire.</p>}
  </section>;
}

export function ProductRecommendations({ title, products }: { title: string; products: CatalogProduct[] }) {
  if (!products.length) return null;
  return <section className="product-detail-recommendations" aria-label={title}><h2>{title}</h2><div className="product-rail">{products.slice(0, 8).map((product) => <ProductCard product={product} key={product.id} />)}</div></section>;
}

export function RecentlyViewed({ productId }: { productId: string }) {
  const [result, setResult] = useState<{ current: string; products: CatalogProduct[] } | null>(null);
  const previous = useRef<{ id: string; ids: string[] } | null>(null);
  useEffect(() => {
    let active = true;
    try {
      // Preserve the same previous list across Strict Mode's effect replay.
      let saved: string[] = [];
      try { saved = recentProductIds(JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || '[]')); } catch { /* Recover from malformed or blocked storage. */ }
      const stored = previous.current?.id === productId ? previous.current.ids : saved;
      previous.current = { id: productId, ids: stored };
      const ids = stored.filter((id) => id !== productId);
      try { localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(rememberProduct(stored, productId))); } catch { /* Browsing still works without persistence. */ }
      if (ids.length) loadRecentProducts(ids).then((products) => { if (active) setResult({ current: productId, products }); }).catch(() => {});
    } catch { /* Storage may be disabled or contain invalid data. */ }
    return () => { active = false; };
  }, [productId]);
  return <ProductRecommendations title="Vus récemment" products={result?.current === productId ? result.products : []} />;
}
