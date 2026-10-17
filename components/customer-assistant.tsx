"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
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
  const label = locale === "ar" ? "تحتاج إلى مساعدة؟" : "Besoin d'aide ?";
  function close() { setOpen(false); launcher.current?.focus(); }
  return <div className={styles.widget} dir={locale === "ar" ? "rtl" : "ltr"}>
    {loaded ? <AssistantChat open={open} onClose={close} /> : null}
    <button ref={launcher} className={styles.launcher} type="button" aria-label={label} aria-expanded={open} aria-controls={loaded ? "goelec-assistant-panel" : undefined} onClick={() => { setLoaded(true); setOpen((current) => !current); }}>
      <span className={styles.launcherAvatar} aria-hidden="true"><Image src="/branding/goelec-assistant-avatar.webp" alt="" width={256} height={256} /></span><span>{label}</span>
    </button>
  </div>;
}
