import { getCategoryNavigation } from "@/lib/category-navigation-server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/storefront-locale";
import type { Metadata } from "next";
import "./globals.css";
import { ApplicationShell } from "@/components/application-shell";
import { getPublicStoreSettings } from "@/lib/settings";
export const metadata: Metadata = {
  title: {
    default: "GO ELEC | Matériel électrique au Maroc",
    template: "%s | GO ELEC",
  },
  description:
    "Votre sélection de matériel électrique, éclairage, câbles et outillage au Maroc. Découvrez les grandes marques et préparez vos projets avec GO ELEC.",
  icons: {
    icon: "/branding/isometric_electrical_repair_cube_logo.png",
    apple: "/branding/isometric_electrical_repair_cube_logo.png",
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings,navigation] = await Promise.all([getPublicStoreSettings(),getCategoryNavigation()]);
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "fr";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <ApplicationShell settings={settings} locale={locale} navigation={navigation}>{children}</ApplicationShell>
      </body>
    </html>
  );
}
