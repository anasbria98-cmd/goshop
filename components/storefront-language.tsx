"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCALE_COOKIE, translate, type StorefrontLocale } from "@/lib/storefront-locale";

const LanguageContext = createContext({
  locale: "fr" as StorefrontLocale,
  setLocale: (() => {}) as (locale: StorefrontLocale) => void,
});

export function StorefrontLanguage({ initialLocale, children, enabled = true }: { initialLocale: StorefrontLocale; children: ReactNode; enabled?: boolean }) {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = enabled ? locale : "fr";
    document.documentElement.dir = enabled && locale === "ar" ? "rtl" : "ltr";
  }, [locale, enabled]);
  const change = (next: StorefrontLocale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setLocale(next);
  };
  return <LanguageContext.Provider value={{ locale: enabled ? locale : "fr", setLocale: change }}>{children}</LanguageContext.Provider>;
}

export function useStorefrontLanguage() {
  const { locale, setLocale } = useContext(LanguageContext);
  return { locale, setLocale, t: (text: string) => translate(text, locale) };
}

/** A fragment keeps the original French markup/layout exactly intact. */
export function StoreText({ children }: { children: ReactNode }) {
  const { t } = useStorefrontLanguage();
  return typeof children === "string" ? t(children) : children;
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useStorefrontLanguage();
  return <span className="country language-switcher" dir="ltr">
    <span aria-hidden="true">🇲🇦</span>
    <button type="button" lang="fr" aria-label="Afficher le site en français" aria-pressed={locale === "fr"} onClick={() => setLocale("fr")}>Français</button>
    <span aria-hidden="true">|</span>
    <button type="button" lang="ar" aria-label="عرض الموقع باللغة العربية" aria-pressed={locale === "ar"} onClick={() => setLocale("ar")}>العربية</button>
  </span>;
}
