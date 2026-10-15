"use client";

import { StorefrontLanguage, StoreText } from "./storefront-language";
import type { StorefrontLocale } from "@/lib/storefront-locale";
import { usePathname } from "next/navigation";
import type { PublicStoreSettings } from "@/lib/settings";
import { Footer } from "./footer";
import { Header } from "./header";
import { StoreProvider } from "./store-provider";
import { WebMCP } from "./webmcp";
import { CustomerAssistant } from "./customer-assistant";

export function ApplicationShell({
  children,
  settings,
  locale,
}: {
  children: React.ReactNode;
  settings: PublicStoreSettings;
  locale: StorefrontLocale;
}) {
  const pathname = usePathname();

  const admin = pathname.startsWith("/admin");

  return (
    <StorefrontLanguage initialLocale={locale} enabled={!admin}>{admin ? <div lang="fr" dir="ltr">{children}</div> : <StoreProvider>
      <WebMCP />
      <a className="skip-link" href="#main">
        <StoreText>Aller au contenu</StoreText>
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <CustomerAssistant />
    </StoreProvider>}</StorefrontLanguage>
  );
}
