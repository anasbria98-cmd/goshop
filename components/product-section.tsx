"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { type Product } from "@/data/catalog";
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
  products: Product[];
  id?: string;
  href?: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  return (
    <section className="product-section wrap" id={id}>
      <div className="section-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        <div className="section-actions">
          <Link href={href}>Tout voir</Link>
          <button
            aria-label={`Précédents — ${title}`}
            onClick={() =>
              rail.current?.scrollBy({ left: -500, behavior: "smooth" })
            }
          >
            <ChevronLeft size={19} />
          </button>
          <button
            aria-label={`Suivants — ${title}`}
            onClick={() =>
              rail.current?.scrollBy({ left: 500, behavior: "smooth" })
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
