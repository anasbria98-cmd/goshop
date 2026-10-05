import Link from "next/link";

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-sign${footer ? " brand-sign-footer" : ""}`}
      aria-label="GO ELEC — accueil"
    >
      <svg
        className="brand-emblem"
        viewBox="0 0 64 58"
        role="img"
        aria-label="Emblème GO ELEC"
      >
        <path
          d="M31.5 3 57 17.5 55.5 43 32 55 7.5 42.5 7 17.5Z"
          fill="#343a40"
        />
        <path d="M31.5 7 31.5 50.5 11 40 10.5 20Z" fill="#315aa8" />
        <path d="M34.5 7.8 53.5 19.5 52 40.5 34.5 50Z" fill="#ef672f" />
        <path
          d="m22 14 8 5-5.5 8h5l-9 14 2.5-11h-6l6-8-5-3.2Z"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
        />
        <path
          d="m39 18 8 8m-10 12 10-10m-8-12 10 10m-12 10 5 5"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="2.3"
        />
      </svg>
      <span className="brand-sign-copy">
        <span className="brand-wordmark">
          GO<span>ELEC</span>
        </span>
        <span className="brand-tagline">
          Matériel électrique · Informatique · Sécurité
        </span>
      </span>
    </Link>
  );
}
