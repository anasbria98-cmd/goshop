import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  footer = false,
  admin = false,
  href = "/",
}: {
  footer?: boolean;
  admin?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`brand-sign${footer ? " brand-sign-footer" : ""}${admin ? " brand-sign-admin" : ""}`}
      aria-label={admin ? "Administration GO ELEC" : "GO ELEC — accueil"}
    >
      <Image
        src={footer ? "/branding/goelec-footer-light.svg" : "/branding/goelec_electrical_security_logo.png"}
        width={1824}
        height={447}
        alt="GO ELEC — Vente Matériel Electrique Informatique et Système de Sécurité"
        className="brand-full-logo"
        unoptimized
      />
      {!footer && !admin && (
        <Image
          src="/branding/isometric_electrical_repair_cube_logo.png"
          width={410}
          height={450}
          alt="GO ELEC"
          className="brand-compact-logo"
          unoptimized
        />
      )}
    </Link>
  );
}
