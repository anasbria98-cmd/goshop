"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';
import type { CatalogProduct } from '@/lib/catalog-model';
import type { ProductReview } from '@/lib/product-reviews';
import { loadRecentProducts, submitProductReview } from '@/app/produit/actions';
import { productShareLinks, recentProductIds, rememberProduct, RECENT_PRODUCTS_KEY } from '@/lib/product-page-model';
import { ProductCard } from './product-card';
import { canonicalProductUrl } from '@/lib/product-url.js';
import { copyProductShare, createProductSharePhoto, mobilePhotoSharingAvailable, instagramNativeShareData } from '@/lib/product-share-client';
import { createWhatsappPreviewWarmup, startWhatsappShare } from '@/lib/whatsapp-preview';
import './product-page-extras.css';

export function ProductShare({ name, slug }: { name: string; slug: string }) {
  const [message, setMessage] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [whatsappFallback, setWhatsappFallback] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const url = canonicalProductUrl(slug);
  const photo = useMemo(() => createProductSharePhoto(slug), [slug]);
  const whatsappPreview = useMemo(() => createWhatsappPreviewWarmup(slug,
    () => document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? null, fetch, () => mobilePhotoSharingAvailable(navigator)), [slug]);
  useEffect(() => {
    const connection = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
    if (connection?.saveData) return;
    const warm = () => { void whatsappPreview.prepare(); };
    if (mobilePhotoSharingAvailable(navigator)) { warm(); return () => whatsappPreview.cancel(); }
    const idle = typeof window.requestIdleCallback === 'function';
    const task = idle ? window.requestIdleCallback(warm, {timeout: 2000}) : window.setTimeout(warm, 700);
    return () => {
      if (idle) window.cancelIdleCallback(task); else window.clearTimeout(task);
      whatsappPreview.cancel();
    };
  }, [whatsappPreview]);
  function prepareWhatsapp() { void whatsappPreview.prepare(); }
  async function shareWhatsapp() {
    if (whatsappBusy) return;
    setWhatsappMessage('');
    try {
      // No awaited work before share(): preserve the original tap's user activation.
      const handoff = startWhatsappShare(name, slug, whatsappPreview.peekFile(), navigator, () => {
        prepareWhatsapp(); social('whatsapp');
      });
      if (handoff.kind === 'link') return;
      setWhatsappBusy(true);
      if (handoff.kind === 'prepare') {
        const prepared = await whatsappPreview.prepare();
        setWhatsappFallback(!prepared);
        setWhatsappMessage(prepared
          ? 'Photo prête. Appuyez à nouveau sur WhatsApp, puis choisissez WhatsApp dans le partage de votre appareil.'
          : 'Photo temporairement indisponible. Réessayez ou partagez uniquement le lien.');
        return;
      }
      await handoff.completion;
      setWhatsappMessage('Photo transmise au partage de votre appareil. Sur iPhone/iPad, copiez le nom et le lien ci-dessous, puis collez-les avec la photo dans WhatsApp. Aucune publication automatique n’a été effectuée.');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setWhatsappFallback(true);
        setWhatsappMessage('Le partage de photo n’a pas abouti. Réessayez ou utilisez le partage du lien.');
      }
    } finally { setWhatsappBusy(false); }
  }
  async function copyWhatsappCaption() {
    const result = await copyProductShare(name, slug, navigator.clipboard);
    setWhatsappMessage(result.copied ? 'Nom et lien copiés : collez-les avec la photo dans WhatsApp.' : result.text);
  }
  useEffect(() => {
    const connection = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
    if (!connection?.saveData) void photo.prepare();
  }, [photo]);
  function preparePhoto() { void photo.prepare(); }
  function prepareFallback() {
    setShowFallback(true);
    setMessage('Pour partager ce produit sur Instagram, utilisez votre mobile et choisissez Instagram dans le partage de votre appareil. Vous pouvez aussi copier le nom et le lien ou enregistrer la photo avec les boutons ci-dessous.');
  }
  function downloadPhoto() {
    const link = document.createElement('a');
    link.href = `/produit/${encodeURIComponent(slug)}/partage.jpg?download=instagram`;
    link.download = `${slug}.jpg`;
    link.hidden = true;
    document.body.appendChild(link);
    try { link.click(); return true; }
    catch { return false; }
    finally { link.remove(); }
  }
  async function shareInstagram() {
    if (sharing) return;
    setMessage('');
    setShowFallback(false);
    setSharing(true);
    try {
      if (!mobilePhotoSharingAvailable(navigator)) { prepareFallback(); return; }
      const ready = photo.peek();
      if (!ready && typeof navigator.canShare === 'function') {
        setMessage('Préparation de la photo du produit…');
        const prepared = await photo.prepare();
        // A download can consume the gesture deadline. A fresh tap reliably opens native sharing.
        if (prepared && navigator.canShare({files: [prepared]})) setMessage('Photo prête. Appuyez à nouveau sur Instagram, puis choisissez Instagram si votre appareil le propose.');
        else prepareFallback();
        return;
      }
      const file = ready && navigator.canShare?.({files: [ready]}) ? ready : undefined;
      if (!file) { prepareFallback(); return; }
      await navigator.share(instagramNativeShareData(name, slug, file, navigator));
      setShowFallback(true);
      setMessage('Photo transmise au partage de votre appareil. Choisissez Instagram si proposé. Sur iPhone/iPad, copiez le nom et le lien ci-dessous et collez-les séparément dans Instagram. Si Instagram est absent, enregistrez la photo puis ouvrez l’application. Aucune publication automatique n’a été effectuée.');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) prepareFallback();
    } finally {
      setSharing(false);
    }
  }
  async function copyUrl() {
    const result = await copyProductShare(name, slug, navigator.clipboard);
    setMessage(result.copied
      ? 'Nom et lien copiés. Collez-les dans Instagram après avoir choisi la photo.'
      : `Copiez le nom et le lien dans Instagram : ${result.text}`);
  }
  function social(network: 'facebook' | 'whatsapp') {
    const links = productShareLinks(url, name);
    window.open(links[network], '_blank', 'noopener,noreferrer');
  }
  return <section className="product-share" aria-labelledby="product-share-title">
    <h2 id="product-share-title">Partagez ce produit</h2>
    <div className="product-share-buttons">
      <button type="button" onClick={() => social('facebook')} aria-label="Partager sur Facebook"><Facebook size={18} />Facebook</button>
      <button type="button" onClick={shareInstagram} onPointerEnter={preparePhoto} onFocus={preparePhoto} onTouchStart={preparePhoto} disabled={sharing} aria-busy={sharing} aria-label="Partager via Instagram ou copier le lien"><Instagram size={18} />Instagram</button>
      <button type="button" onClick={shareWhatsapp} disabled={whatsappBusy} aria-busy={whatsappBusy} onPointerEnter={prepareWhatsapp} onFocus={prepareWhatsapp} onTouchStart={prepareWhatsapp} aria-label="Partager sur WhatsApp"><MessageCircle size={18} />WhatsApp</button>
    </div>
    {whatsappMessage && <div className="product-share-status" role="status">{whatsappMessage}<button type="button" onClick={copyWhatsappCaption}>Copier le nom et le lien pour WhatsApp</button>{whatsappFallback && <button type="button" onClick={() => social('whatsapp')}>Partager uniquement le lien</button>}</div>}
    {message && <div className="product-share-status" role="status">{message}{showFallback && <><button type="button" onClick={downloadPhoto}>Enregistrer la photo</button><button type="button" onClick={copyUrl}>Copier le nom et le lien</button></>}</div>}
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
