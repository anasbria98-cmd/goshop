"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, LoaderCircle, Send, X } from "lucide-react";
import { getPublicSupabaseEnv } from "@/lib/env";
import { requestAssistant, type AssistantMessage, type AssistantProduct } from "@/lib/assistant-client";
import { useStorefrontLanguage } from "./storefront-language";
import styles from "./customer-assistant.module.css";

type ChatMessage = AssistantMessage & { id: number; products?: AssistantProduct[] };

export default function AssistantChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useStorefrontLanguage();
  const ar = locale === "ar";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const lastRequest = useRef<AssistantMessage[] | null>(null);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const greeting = ar ? "مرحباً 👋 أنا مساعد GO ELEC. كيف يمكنني مساعدتك اليوم؟" : "Bonjour 👋 Je suis l’assistant GO ELEC. Comment puis-je vous aider aujourd’hui ?";
  const quick = ar ? ["العثور على منتج", "اختيار المعدات", "التحقق من السعر", "أحتاج إلى نصيحة"] : ["Trouver un produit", "Choisir du matériel", "Vérifier un prix", "Besoin d’un conseil"];

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { const log = logRef.current; if (log && open) log.scrollTop = log.scrollHeight; }, [messages, loading, error, open]);
  useEffect(() => () => controller.current?.abort(), []);

  async function send(text: string, retry = false) {
    const content = text.trim();
    if (pending.current || (!retry && (!content || content.length > 1000 || messages.length >= 40))) return;
    const history: AssistantMessage[] = retry && lastRequest.current ? lastRequest.current : [...messages.map(({ role, content: value }) => ({ role, content: value.slice(0, 1000) })), { role: "user" as const, content }].slice(-10);
    while (history.reduce((length, message) => length + message.content.length, 0) > 8000) history.shift();
    while (new TextEncoder().encode(JSON.stringify({ messages: history })).length > 12000) history.shift();
    pending.current = true;
    setLoading(true); setError(null);
    if (!retry) {
      const id = nextId.current++;
      setMessages((current) => [...current, { id, role: "user", content }]);
      setInput("");
    }
    lastRequest.current = history;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const reply = await requestAssistant(history, getPublicSupabaseEnv(), AbortSignal.any([abort.signal, AbortSignal.timeout(35000)]));
      if (!abort.signal.aborted) {
        const id = nextId.current++;
        setMessages((current) => [...current, { id, role: "assistant", content: reply.answer, products: reply.products }]);
      }
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error && cause.message === "rate_limited" ? "limited" : "unavailable");
    } finally {
      if (!abort.signal.aborted) { pending.current = false; setLoading(false); inputRef.current?.focus(); }
    }
  }

  const title = ar ? "مساعد GO ELEC" : "Assistant GO ELEC";
  return <section id="goelec-assistant-panel" className={styles.panel} hidden={!open} role="dialog" aria-modal="false" aria-labelledby="goelec-assistant-title" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className={styles.header}>
      <span className={styles.avatar}><Bot size={25} aria-hidden="true" /></span>
      <div><h2 id="goelec-assistant-title">{title}</h2><p>{ar ? "كيف يمكننا مساعدتك؟" : "Comment pouvons-nous vous aider ?"}</p></div>
      <button type="button" className={styles.close} aria-label={ar ? "تصغير المساعد" : "Réduire l’assistant"} onClick={onClose}><X size={21} aria-hidden="true" /></button>
    </header>
    <div ref={logRef} className={styles.log} role="log" aria-label={ar ? "المحادثة" : "Conversation"} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
      <div className={styles.assistantMessage}><p>{greeting}</p></div>
      {!messages.length ? <div className={styles.quick}>{quick.map((text) => <button key={text} type="button" onClick={() => void send(text)}>{text}</button>)}</div> : null}
      {messages.map((message) => <div key={message.id} className={message.role === "user" ? styles.userMessage : styles.assistantMessage}>
        <span className={styles.srOnly}>{message.role === "user" ? (ar ? "أنت" : "Vous") : title} : </span>
        <p dir="auto">{message.content}</p>
        {message.products?.length ? <ul className={styles.products}>{message.products.map((product) => <li key={product.id}>
          <Link href={product.href} onClick={onClose}>{product.name}</Link>
          {product.brand ? <span>{product.brand}</span> : null}
          <span dir="auto">{ar ? "المرجع" : "Réf."} {product.sku}</span>
          {product.price !== null ? <strong dir="ltr">{new Intl.NumberFormat(ar ? "ar-MA" : "fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.price)} DH</strong> : <span>{ar ? "السعر على صفحة المنتج" : "Prix à vérifier sur la fiche"}</span>}
          {product.description ? <p>{product.description}</p> : null}
        </li>)}</ul> : null}
        {message.products?.length ? <small>{ar ? "السعر حسب المنتج. تحقق من الخيارات والتوفر على الصفحة." : "Prix du produit. Vérifiez les variantes et la disponibilité sur la fiche."}</small> : null}
      </div>)}
      {loading ? <p className={styles.typing} role="status"><LoaderCircle size={16} aria-hidden="true" />{ar ? "المساعد يكتب…" : "L’assistant vous répond…"}</p> : null}
      {error ? <div className={styles.error} role="alert"><p>{error === "limited" ? (ar ? "يرجى الانتظار قليلاً قبل إرسال رسالة أخرى." : "Veuillez patienter un instant avant de réessayer.") : (ar ? "المساعد غير متاح مؤقتاً. يرجى المحاولة مرة أخرى." : "L’assistant est temporairement indisponible. Veuillez réessayer.")}</p><button type="button" disabled={loading} onClick={() => void send("", true)}>{ar ? "إعادة المحاولة" : "Réessayer"}</button></div> : null}
    </div>
    <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(input); }}>
      <label className={styles.srOnly} htmlFor="goelec-assistant-input">{ar ? "رسالتك" : "Votre message"}</label>
      <input ref={inputRef} id="goelec-assistant-input" dir="auto" value={input} maxLength={1000} onChange={(event) => setInput(event.target.value)} placeholder={ar ? "اكتب رسالتك…" : "Écrivez votre message…"} disabled={messages.length >= 40} autoComplete="off" />
      <button type="submit" disabled={loading || !input.trim() || messages.length >= 40} aria-label={ar ? "إرسال الرسالة" : "Envoyer le message"}><Send size={19} aria-hidden="true" /></button>
    </form>
    <p className={styles.privacy}>{messages.length >= 40 ? (ar ? "اكتملت المحادثة. حدّث الصفحة لبدء محادثة جديدة." : "Conversation terminée. Actualisez la page pour recommencer.") : (ar ? "مساعد ذكي · لا تشارك كلمات المرور أو بيانات الدفع." : "Assistant IA · Ne partagez ni mot de passe ni données de paiement.")}</p>
  </section>;
}
