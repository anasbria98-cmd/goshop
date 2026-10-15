"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, X } from "lucide-react";
import { answerHelpQuestion, helpQuestions, helpTopicAnswer, type HelpLink } from "@/data/assistant-faq";
import { useStorefrontLanguage } from "./storefront-language";
import styles from "./customer-assistant.module.css";

type ChatMessage = { id: number; role: "user" | "assistant"; content: string; links?: HelpLink[] };

export default function AssistantChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale } = useStorefrontLanguage();
  const ar = locale === "ar";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [allQuestions, setAllQuestions] = useState(false);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastAnswerRef = useRef<HTMLDivElement>(null);
  const questions = helpQuestions(locale);
  const visibleQuestions = allQuestions ? questions : questions.slice(0, 4);
  const greeting = ar ? "مرحباً 👋 أهلاً بك في مساعدة GO ELEC. اختر سؤالاً للحصول على إجابة فورية، أو اكتب موضوع سؤالك." : "Bonjour 👋 Bienvenue dans l’aide GO ELEC. Choisissez une question pour une réponse immédiate, ou indiquez le sujet de votre demande.";

  useEffect(() => { if (open) inputRef.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => {
    const log = logRef.current;
    const answer = lastAnswerRef.current;
    if (log && answer && open) log.scrollTop += answer.getBoundingClientRect().top - log.getBoundingClientRect().top - 12;
  }, [messages, open]);

  function send(text: string, topicId?: string) {
    const content = text.trim();
    if (!content || content.length > 500) return;
    const reply = topicId ? helpTopicAnswer(topicId, locale) : answerHelpQuestion(content, locale);
    const userId = nextId.current++;
    const replyId = nextId.current++;
    setMessages((current) => [...current.slice(-38), { id: userId, role: "user", content }, { id: replyId, role: "assistant", content: reply.text, links: reply.links }]);
    setInput("");
    setAllQuestions(false);
    inputRef.current?.focus({ preventScroll: true });
  }

  const title = ar ? "مساعدة GO ELEC" : "Assistance GO ELEC";
  return <section id="goelec-assistant-panel" className={styles.panel} hidden={!open} role="dialog" aria-modal="false" aria-labelledby="goelec-assistant-title" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className={styles.header}>
      <span className={styles.avatar}><Bot size={25} aria-hidden="true" /></span>
      <div><h2 id="goelec-assistant-title">{title}</h2><p>{ar ? "كيف يمكننا مساعدتك؟" : "Comment pouvons-nous vous aider ?"}</p></div>
      <button type="button" className={styles.close} aria-label={ar ? "تصغير المساعدة" : "Réduire l’assistance"} onClick={onClose}><X size={21} aria-hidden="true" /></button>
    </header>
    <div ref={logRef} className={styles.log} role="log" aria-label={ar ? "المحادثة" : "Conversation"} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
      <div className={styles.assistantMessage}><p>{greeting}</p></div>
      {messages.map((message, index) => <div key={message.id} ref={index === messages.length - 1 ? lastAnswerRef : undefined} className={message.role === "user" ? styles.userMessage : styles.assistantMessage}>
        <span className={styles.srOnly}>{message.role === "user" ? (ar ? "أنت" : "Vous") : title} : </span>
        <p dir="auto">{message.content}</p>
        {message.links?.length ? <ul className={styles.links}>{message.links.map((link) => <li key={link.href}>
          {link.href.startsWith("https://") || link.href.startsWith("tel:") ? <a href={link.href} target={link.href.startsWith("https://") ? "_blank" : undefined} rel={link.href.startsWith("https://") ? "noopener noreferrer" : undefined}>{link.label}</a> : <Link href={link.href} prefetch={false} onClick={onClose}>{link.label}</Link>}
        </li>)}</ul> : null}
      </div>)}
      <div className={styles.questions} aria-label={ar ? "أسئلة شائعة" : "Questions fréquentes"}>
        <div className={styles.quick}>{visibleQuestions.map((question) => <button key={question.id} type="button" onClick={() => send(question.label, question.id)}>{question.label}</button>)}</div>
        <button className={styles.more} type="button" aria-expanded={allQuestions} onClick={() => setAllQuestions((current) => !current)}>{allQuestions ? (ar ? "أسئلة أقل" : "Moins de questions") : (ar ? "أسئلة أخرى" : "Autres questions")}</button>
      </div>
    </div>
    <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); send(input); }}>
      <label className={styles.srOnly} htmlFor="goelec-assistant-input">{ar ? "موضوع سؤالك" : "Le sujet de votre question"}</label>
      <input ref={inputRef} id="goelec-assistant-input" dir="auto" value={input} maxLength={500} onChange={(event) => setInput(event.target.value)} placeholder={ar ? "التوصيل، الطلب، منتج…" : "Livraison, commande, produit…"} autoComplete="off" />
      <button type="submit" disabled={!input.trim()} aria-label={ar ? "إرسال السؤال" : "Envoyer la question"}><Send size={19} aria-hidden="true" /></button>
    </form>
    <p className={styles.privacy}>{ar ? "إجابات جاهزة · بدون ذكاء اصطناعي · للمساعدة الخاصة، تواصل مع فريقنا." : "Réponses préparées · Sans IA · Notre équipe reste à votre écoute."}</p>
  </section>;
}
