"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Instagram,
  Facebook,
  Linkedin,
} from "lucide-react";
import { storeInfo } from "@/data/catalog";
import { BrandLogo } from "./brand-logo";
export function Footer() {
  const [message, setMessage] = useState("");
  return (
    <footer>
      <div className="newsletter">
        <div className="wrap newsletter-inner">
          <div>
            <Mail size={27} />
            <div>
              <h2>Les bons plans, directement chez vous.</h2>
              <p>Nouveautés, sélections et offres GO ELEC.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setMessage(
                "La newsletter sera disponible à l’ouverture de la boutique. Aucun e-mail n’a été enregistré.",
              );
            }}
          >
            <label className="sr-only" htmlFor="newsletter-email">
              Votre adresse e-mail
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="Votre adresse e-mail"
            />
            <button>S’inscrire</button>
            <span role="status">{message}</span>
          </form>
        </div>
      </div>
      <div className="footer-main">
        <div className="wrap footer-grid">
          <div className="footer-about">
            <BrandLogo footer />
            <p>
              Le bon matériel pour tous vos projets.
              <br />
              Votre spécialiste électrique au Maroc.
            </p>
            <p>
              <Phone size={14} />
              {storeInfo.phone}
              <br />
              <Mail size={14} />
              {storeInfo.email}
              <br />
              <MapPin size={14} />
              {storeInfo.address}
            </p>
            <div
              className="socials"
              aria-label="Réseaux sociaux — bientôt disponibles"
            >
              <span title="Instagram — bientôt">
                <Instagram size={18} />
              </span>
              <span title="Facebook — bientôt">
                <Facebook size={18} />
              </span>
              <span title="LinkedIn — bientôt">
                <Linkedin size={18} />
              </span>
            </div>
          </div>
          <FooterGroup
            title="GO ELEC"
            links={[
              ["À propos", "a-propos"],
              ["Nous contacter", "contact"],
              ["Points de retrait", "magasins"],
            ]}
          />
          <FooterGroup
            title="Besoin d’aide ?"
            links={[
              ["Livraison", "livraison"],
              ["Paiement", "paiement"],
              ["Retours & garanties", "retours"],
              ["Questions fréquentes", "faq"],
            ]}
          />
          <div>
            <h3>Mon espace</h3>
            <Link href="/compte">Mon compte</Link>
            <Link href="/compte">Mes commandes</Link>
            <Link href="/favoris">Mes favoris</Link>
            <Link href="/panier">Mon panier</Link>
          </div>
          <FooterGroup
            title="Informations"
            links={[
              ["Conditions générales de vente", "cgv"],
              ["Politique de confidentialité", "confidentialite"],
              ["Mentions légales", "mentions-legales"],
            ]}
          />
        </div>
        <div className="wrap footer-bottom">
          <span>
            © {new Date().getFullYear()} GO ELEC — Tous droits réservés.
          </span>
          <div>
            <ShieldCheck size={16} />
            <span>Paiement sécurisé</span>
            <b>VISA</b>
            <b>Mastercard</b>
            <span>Paiement à la livraison*</span>
          </div>
        </div>
        <div className="wrap demo-note">
          Catalogue de démonstration · Visuels, prix et disponibilités
          indicatifs · *Modalités de paiement et de livraison à confirmer avant
          ouverture.
        </div>
      </div>
    </footer>
  );
}
function FooterGroup({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h3>{title}</h3>
      {links.map(([label, slug]) => (
        <Link key={slug} href={`/informations/${slug}`}>
          {label}
        </Link>
      ))}
    </div>
  );
}
