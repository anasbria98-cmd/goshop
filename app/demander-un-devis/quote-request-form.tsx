'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle, Paperclip, X } from 'lucide-react';
import { quoteFileError, quoteRequestSchema, quoteReference, type QuoteCategory } from '@/lib/quote-request';
import styles from './quote-request.module.css';

type Errors = Record<string, string[] | undefined>;
export function QuoteRequestForm({categories}: {categories: QuoteCategory[]}) {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const requestId = useRef<string | null>(null);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const showError = (message: string) => { setError(message); requestAnimationFrame(() => feedback.current?.focus()); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = quoteRequestSchema.safeParse(Object.fromEntries(data));
    setErrors({}); setError('');
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setErrors(fields);
      const first = Object.keys(fields)[0];
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const invalidFile = quoteFileError(files);
    if (invalidFile) { showError(invalidFile); return; }
    sending.current = true; setBusy(true);
    requestId.current ??= crypto.randomUUID();
    data.set('request_id', requestId.current);
    data.delete('files');
    files.forEach(file => data.append('files', file));
    try {
      const response = await fetch('/api/quote-requests', {method: 'POST', body: data});
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (result.fields) setErrors(result.fields);
        showError(typeof result.error === 'string' ? result.error : 'Votre demande n’a pas pu être envoyée. Veuillez réessayer.');
        return;
      }
      setSaved(result.id);
    } catch { showError('Connexion interrompue. Vos informations sont conservées dans ce formulaire. Réessayez pour confirmer l’envoi.'); }
    finally { sending.current = false; setBusy(false); }
  }
  const fieldError = (name: string) => errors[name]?.length ? <small className={styles.fieldError} id={`quote-${name}-error`}>{errors[name]![0]}</small> : null;
  const describedBy = (name: string) => errors[name]?.length ? `quote-${name}-error` : undefined;
  if (saved) return <div className={styles.success} role="status" tabIndex={-1} ref={el => { if (el) el.focus(); }}><CheckCircle2 size={40} aria-hidden="true"/><h3>Votre demande a bien été reçue.</h3><p>Merci ! GO ELEC étudiera votre besoin et vous contactera aux coordonnées indiquées.</p><p className={styles.reference}>Référence : {quoteReference(saved)}</p><Link className="button navy" href="/">Retour à l’accueil</Link></div>;
  return <form method="post" action="/api/quote-requests" encType="multipart/form-data" onSubmit={submit} noValidate onChange={() => {if (!sending.current) requestId.current = null;}}>
    <fieldset disabled={busy} className={styles.fields}>
      <div className={styles.pair}>{[['first_name', 'Prénom', 'given-name'], ['last_name', 'Nom', 'family-name']].map(([name, label, autoComplete]) => <div className={styles.field} key={name}><label htmlFor={`quote-${name}`}>{label} *</label><input id={`quote-${name}`} name={name} autoComplete={autoComplete} required maxLength={80} aria-invalid={!!errors[name]} aria-describedby={describedBy(name)}/>{fieldError(name)}</div>)}</div>
      <div className={styles.pair}><div className={styles.field}><label htmlFor="quote-phone">Téléphone *</label><input id="quote-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue="+212 " required maxLength={25} aria-invalid={!!errors.phone} aria-describedby={describedBy('phone') || 'quote-phone-help'}/><small id="quote-phone-help">Exemple : +212 6 12 34 56 78</small>{fieldError('phone')}</div><div className={styles.field}><label htmlFor="quote-email">Email *</label><input id="quote-email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={!!errors.email} aria-describedby={describedBy('email')}/>{fieldError('email')}</div></div>
      <div className={styles.field}><label htmlFor="quote-category_id">Type de demande / Catégorie *</label><select id="quote-category_id" name="category_id" defaultValue="" required aria-invalid={!!errors.category_id} aria-describedby={describedBy('category_id')}><option value="" disabled>Choisissez votre type de demande</option><option value="general">Demande générale / plusieurs catégories</option>{categories.map(c => <option value={c.id} key={c.id}>{c.label}</option>)}</select>{fieldError('category_id')}</div>
      <div className={styles.field}><label htmlFor="quote-subject">Sujet *</label><input id="quote-subject" name="subject" required minLength={3} maxLength={160} placeholder="Ex. : Matériel pour une installation électrique" aria-invalid={!!errors.subject} aria-describedby={describedBy('subject')}/>{fieldError('subject')}</div>
      <div className={styles.field}><label htmlFor="quote-message">Message / description du besoin *</label><textarea id="quote-message" name="message" rows={5} required minLength={10} maxLength={5000} placeholder="Précisez les produits, quantités ou détails utiles à votre projet…" aria-invalid={!!errors.message} aria-describedby={describedBy('message')}/>{fieldError('message')}</div>
      <div className={styles.field}><label htmlFor="quote-files">Photos ou documents <span>(facultatif)</span></label><div className={styles.upload}><Paperclip size={21} aria-hidden="true"/><span>Joindre des photos ou un PDF</span><input ref={fileInput} key={fileKey} id="quote-files" type="file" name="files" multiple accept="image/jpeg,image/png,image/webp,application/pdf" aria-describedby="quote-files-help" onChange={e => {const next = [...files, ...Array.from(e.currentTarget.files || [])]; const invalid = quoteFileError(next); if (invalid) showError(invalid); else {setFiles(next); setError('');} setFileKey(k => k + 1);}}/></div><small id="quote-files-help">JPG, PNG, WebP, PDF · 3 fichiers maximum · 5 Mo par fichier, 8 Mo au total.</small>{files.length > 0 && <ul className={styles.fileList}>{files.map((file, index) => <li key={`${file.name}-${index}`}><Paperclip size={15} aria-hidden="true"/><span>{file.name}</span><button type="button" aria-label={`Retirer ${file.name}`} onClick={() => {setFiles(files.filter((_, i) => i !== index)); requestId.current = null; requestAnimationFrame(() => fileInput.current?.focus());}}><X size={17}/></button></li>)}</ul>}</div>
      <div className={styles.honeypot} aria-hidden="true"><label htmlFor="quote-website">Site web</label><input id="quote-website" name="website" tabIndex={-1} autoComplete="off"/></div>
      <p className={styles.notice}>En envoyant ce formulaire, vous nous transmettez les informations nécessaires à l’étude de votre demande.</p>
    </fieldset>
    {error && <div className={styles.error} role="alert" ref={feedback} tabIndex={-1}>{error}</div>}
    <button className={`button navy ${styles.submit}`} type="submit" disabled={busy} aria-busy={busy}>{busy ? <><LoaderCircle className={styles.spinner} size={19} aria-hidden="true"/>Envoi en cours…</> : <>Envoyer ma demande de devis<ArrowRight size={19} aria-hidden="true"/></>}</button>
  </form>;
}
