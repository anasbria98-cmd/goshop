import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { WebMCP } from "@/components/webmcp";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
export const metadata: Metadata = {
  title: {
    default: "Goshop.ma | Matériel électrique au Maroc",
    template: "%s | Goshop.ma",
  },
  description:
    "Votre sélection de matériel électrique, éclairage, câbles et outillage au Maroc. Découvrez les grandes marques et préparez vos projets avec Goshop.ma.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <StoreProvider>
          <WebMCP />
          <a className="skip-link" href="#main">
            Aller au contenu
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
