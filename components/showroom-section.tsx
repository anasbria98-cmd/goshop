import Image from "next/image";
import { MapPin, Phone, ArrowUpRight } from "lucide-react";
import { StoreText } from "./storefront-language";
import type { PublicStoreSettings } from "@/lib/settings";
import styles from "./showroom-section.module.css";

const mapsUrl = "https://www.google.com/maps/place/GOELEC+s.a.r.l/data=!4m2!3m1!1s0x0:0x14dfdc0be6084066?sa=X&ved=1t:2428&ictx=111";
// Verified against the client-provided Google Maps listing; prefer the public store setting when available.
const storeAddress = "EL AZHARI 2 Rue 41 N°149 Casablanca";

export function ShowroomSection({ settings }: { settings: PublicStoreSettings }) {
  const address = typeof settings.business_address === "string" && settings.business_address.trim()
    ? settings.business_address : storeAddress;

  return <section className={`wrap ${styles.section}`} aria-labelledby="showroom-title">
    <div className={styles.card}>
      <div className={styles.photo}>
        <div className={styles.frame}>
          <Image src="/store/go-elec-storefront-landscape.jpg" alt="La devanture et les deux vues intérieures du magasin GO ELEC" width={590} height={591} sizes="(max-width: 767px) calc(100vw - 52px), 482px" quality={100} />
        </div>
      </div>
      <div className={styles.information}>
        <span className={`eyebrow ${styles.label}`}><StoreText>VISITEZ NOTRE SHOWROOM</StoreText></span>
        <h2 id="showroom-title">GO ELEC</h2>
        <address className={styles.details}>
          <p><MapPin size={20} aria-hidden="true" /><span>{address}</span></p>
          <a href="tel:+212522900590"><Phone size={20} aria-hidden="true" /><span>05 22 90 05 90</span></a>
          <a href="tel:+212644535251"><Phone size={20} aria-hidden="true" /><span>+212 644 535 251</span></a>
        </address>
        <a className={`button navy ${styles.cta}`} href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <StoreText>Voir l’itinéraire</StoreText><ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </div>
    </div>
  </section>;
}
