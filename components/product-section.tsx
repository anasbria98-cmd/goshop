"use client";
import { StoreText, useStorefrontLanguage } from "@/components/storefront-language";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { type CatalogProduct } from "@/lib/catalog-model";
import { ProductCard } from "./product-card";
export function ProductSection({
  title,
  eyebrow,
  products,
  id,
  href = "/recherche",
}: {
  title: string;
  eyebrow?: string;
  products: CatalogProduct[];
  id?: string;
  href?: string;
}) {
  const { t, locale } = useStorefrontLanguage();
  const rail = useRef<HTMLDivElement>(null);
  return (
    <section className="product-section wrap" id={id}>
      <div className="section-heading">
        <div>
          {eyebrow && <span className="eyebrow"><StoreText>{eyebrow}</StoreText></span>}
          <h2><StoreText>{title}</StoreText></h2>
        </div>
        <div className="section-actions">
          <Link href={href}><StoreText>Tout voir</StoreText></Link>
          <button
            aria-label={`${t("Précédents")} — ${t(title)}`}
            onClick={() =>
              rail.current?.scrollBy({ left: locale === "ar" ? 500 : -500, behavior: "smooth" })
            }
          >
            <ChevronLeft size={19} />
          </button>
          <button
            aria-label={`${t("Suivants")} — ${t(title)}`}
            onClick={() =>
              rail.current?.scrollBy({ left: locale === "ar" ? -500 : 500, behavior: "smooth" })
            }
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
      <div className="product-rail" ref={rail}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
