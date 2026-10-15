"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Bot } from "lucide-react";
import { usePathname } from "next/navigation";
import { useStorefrontLanguage } from "./storefront-language";
import styles from "./customer-assistant.module.css";

const AssistantChat = dynamic(() => import("./customer-assistant-chat"), {
  ssr: false,
  loading: () => <span className={styles.starting} role="status">…</span>,
});

export function CustomerAssistant() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { locale } = useStorefrontLanguage();
  // Keep authentication and transactional screens free of floating controls.
  if (pathname.startsWith("/auth") || pathname.startsWith("/checkout") || pathname.startsWith("/compte") || pathname === "/panier") return null;
  const label = locale === "ar" ? "تحتاج إلى مساعدة؟" : "Besoin d’aide ?";
  function close() { setOpen(false); launcher.current?.focus(); }
  return <div className={styles.widget} dir={locale === "ar" ? "rtl" : "ltr"}>
    {loaded ? <AssistantChat open={open} onClose={close} /> : null}
    <button ref={launcher} className={styles.launcher} type="button" aria-label={label} aria-expanded={open} aria-controls={loaded ? "goelec-assistant-panel" : undefined} onClick={() => { setLoaded(true); setOpen((current) => !current); }}>
      <span className={styles.launcherAvatar} aria-hidden="true">{open ? <Bot size={23} /> : <svg viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="18" fill="white" />
        <path d="M18 7v3" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="18" cy="6" r="2" fill="var(--navy)" />
        <rect x="7" y="10" width="22" height="17" rx="7" fill="var(--navy)" />
        <circle cx="13" cy="17" r="2" fill="white" />
        <circle cx="23" cy="17" r="2" fill="white" />
        <path d="M14 22c2 2 6 2 8 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 32c1-3 4-4 7-4s6 1 7 4" fill="var(--navy)" />
      </svg>}</span><span>{label}</span>
    </button>
  </div>;
}
