import Image from "next/image";
import { MapPin, Phone, ArrowUpRight } from "lucide-react";
import { StoreText } from "./storefront-language";
import type { PublicStoreSettings } from "@/lib/settings";
import styles from "./showroom-section.module.css";

const mapsUrl = "https://www.google.com/maps/place/GOELEC+s.a.r.l/data=!4m2!3m1!1s0x0:0x14dfdc0be6084066?sa=X&ved=1t:2428&ictx=111";
// Verified against the client-provided Google Maps listing; prefer the public store setting when available.
const storeAddress = "EL AZHARI 2 Rue 41 N°149 Oulfa Casablanca";

export function ShowroomSection({ settings }: { settings: PublicStoreSettings }) {
  const address = typeof settings.business_address === "string" && settings.business_address.trim()
    ? settings.business_address : storeAddress;

  return <section className={`wrap ${styles.section}`} aria-labelledby="showroom-title">
    <div className={styles.card}>
      <div className={styles.photo}>
        <div className={styles.frame}>
          <Image src="/store/go-elec-showroom-approved-reference.png" alt="La devanture et les deux vues intérieures du magasin GO ELEC" width={1536} height={1024} sizes="(max-width: 767px) 1100px, 1536px" quality={100} />
        </div>
      </div>
      <div className={styles.information}>
        <span className={`eyebrow ${styles.label}`}><StoreText>VISITEZ NOTRE SHOWROOM</StoreText></span>
        <h2 id="showroom-title">GO ELEC</h2>
        <address className={styles.details}>
          <p><MapPin size={20} aria-hidden="true" /><span>{address}</span></p>
          <a href="tel:+212522900590"><Phone size={20} aria-hidden="true" /><span>05 22 90 05 90</span></a>
          <a href="tel:+212644535251"><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a9 9 0 0 1-13.4 7.9L3 21l1.6-4.6A9 9 0 1 1 21 11.5Z" /><path d="m8 7 2 3-1.2 1.2a7 7 0 0 0 4 4L14 14l3 2c-.5 1.5-1.5 2-3 1.5a12 12 0 0 1-7.5-7.5C6 8.5 6.5 7.5 8 7Z" /></svg><span>+212 644 535 251</span></a>
        </address>
        <a className={`button navy ${styles.cta}`} href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <StoreText>Voir l’itinéraire</StoreText><ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
    </div>
  </section>;
}
