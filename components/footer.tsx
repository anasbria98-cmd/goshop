"use client";
import { StoreText, useStorefrontLanguage } from "@/components/storefront-language";
import Link from "next/link";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";
import type { PublicStoreSettings } from "@/lib/settings";
import { BrandLogo } from "./brand-logo";
export function Footer({ settings }: { settings: PublicStoreSettings }) {
  const { t } = useStorefrontLanguage();
  const [message, setMessage] = useState("");
  return (
    <footer>
      <div className="newsletter">
        <div className="wrap newsletter-inner">
          <div>
            <Mail size={27} />
            <div>
              <h2><StoreText>Les bons plans, directement chez vous.</StoreText></h2>
              <p><StoreText>Nouveautés, sélections et offres GO ELEC.</StoreText></p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(
                "L’inscription à la newsletter n’est pas activée. Aucun e-mail n’a été enregistré.",
              );
            }}
          >
            <label className="sr-only" htmlFor="newsletter-email"><StoreText>
              Votre adresse e-mail
            </StoreText></label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder={t("Votre adresse e-mail")}
            />
            <button><StoreText>S’inscrire</StoreText></button>
            <span role="status"><StoreText>{message}</StoreText></span>
          </form>
        </div>
      </div>
      <div className="footer-main">
        <div className="wrap footer-grid">
          <div className="footer-about">
            <BrandLogo footer />
            <p><StoreText>
              Le bon matériel pour tous vos projets.
              </StoreText><br /><StoreText>
              Votre spécialiste électrique au Maroc.
            </StoreText></p>
            <div className="footer-contacts">
              <a href="https://wa.me/212644535251" target="_blank" rel="noopener noreferrer" aria-label={t("WhatsApp : 06 44 53 52 51")}>
                <WhatsAppIcon />
                <span>06 44 53 52 51</span>
              </a>
              <a href="tel:+212522900590" aria-label={`${t("Téléphone")} : 05 22 90 05 90`}>
                <Phone size={18} aria-hidden="true" />
                <span>05 22 90 05 90</span>
              </a>
            </div>
            <p>
              {typeof settings.support_email === "string" && <><Mail size={14} />{settings.support_email}<br /></>}
              {typeof settings.business_address === "string" && <><MapPin size={14} />{settings.business_address}</>}
            </p>
            <div
              className="socials"
              aria-label={t("Réseaux sociaux")}
            >
              <a href="https://m.facebook.com/GOELECsarl/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook">
                <Facebook size={18} aria-hidden="true" />
              </a>
              <a href="https://www.instagram.com/goelec_sarl?exln=MTlxNzFvYTBrZnFzNg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram">
                <Instagram size={18} aria-hidden="true" />
              </a>
              <a href="https://www.tiktok.com/@goelecsarl" target="_blank" rel="noopener noreferrer" aria-label="TikTok" title="TikTok">
                <TikTokIcon />
              </a>
              <a href="https://youtube.com/@goelecsarl1180?si=swE9Z_IqDH8RqefW" target="_blank" rel="noopener noreferrer" aria-label="YouTube" title="YouTube">
                <Youtube size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
          <FooterGroup
            title={t("GO ELEC")}
            links={[
              ["À propos", "a-propos"],
              ["Nous contacter", "contact"],
              ["Points de retrait", "magasins"],
            ]}
          />
          <FooterGroup
            title={t("Besoin d’aide ?")}
            links={[
              ["Livraison", "livraison"],
              ["Paiement", "paiement"],
              ["Retours & garanties", "retours"],
              ["Questions fréquentes", "faq"],
            ]}
          />
          <div>
            <h3><StoreText>Mon espace</StoreText></h3>
            <Link href="/compte"><StoreText>Mon compte</StoreText></Link>
            <Link href="/compte"><StoreText>Mes commandes</StoreText></Link>
            <Link href="/favoris"><StoreText>Mes favoris</StoreText></Link>
            <Link href="/panier"><StoreText>Mon panier</StoreText></Link>
          </div>
          <FooterGroup
            title={t("Informations")}
            links={[
              ["Conditions générales de vente", "cgv"],
              ["Politique de confidentialité", "confidentialite"],
              ["Mentions légales", "mentions-legales"],
            ]}
          />
        </div>
        <div className="wrap footer-bottom">
          <span>
            © {new Date().getFullYear()}<StoreText> GO ELEC — Tous droits réservés.
          </StoreText></span>
        </div>
      </div>
    </footer>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.84 11.84 0 0 0 12.04 0C5.48 0 .14 5.34.14 11.9c0 2.1.55 4.15 1.6 5.96L.05 24l6.29-1.65a11.9 11.9 0 0 0 5.69 1.45h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.42-8.42ZM12.04 21.8a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.74.98 1-3.64-.24-.38a9.85 9.85 0 0 1-1.52-5.27c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7c0 5.45-4.44 9.89-9.9 9.89Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.1 4.49.71.3 1.27.48 1.71.62.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-.42-.24 5.88 5.88 0 0 1-1.07-.91A5.03 5.03 0 0 1 16.96 2H13.5v13.36a2.89 2.89 0 0 1-2.89 2.69 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.3 0 .6.05.87.14V8.9a6.51 6.51 0 0 0-.87-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.4a8.51 8.51 0 0 0 4.97 1.6V6.55c-.78 0-1.58-.21-2.33-.6v.74Z" />
    </svg>
  );
}
function FooterGroup({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h3><StoreText>{title}</StoreText></h3>
      {links.map(([label, slug]) => (
        <Link key={slug} href={`/informations/${slug}`}>
          <StoreText>{label}</StoreText>
        </Link>
      ))}
    </div>
  );
}
