"use client";
import { useStorefrontLanguage } from "./storefront-language";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { HeroSlide as Slide } from "@/lib/home-slides";

export function HeroCarousel({ slides, label, primary = false }: { slides: Slide[]; label: string; primary?: boolean }) {
  const { t } = useStorefrontLanguage();
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const hover = useRef(false);
  const focused = useRef(false);
  const move = (direction: number) => setActive((index) => (index + direction + slides.length) % slides.length);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(preference.matches);
    const visibility = () => setVisible(!document.hidden);
    motion();
    visibility();
    preference.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      preference.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || interacting || reducedMotion || !visible) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 4500);
    return () => window.clearInterval(timer);
  }, [active, interacting, reducedMotion, visible, slides.length]);

  if (!slides.length) return <div className={`promo-carousel${primary ? " promo-carousel-primary" : ""}`} />;

  return <div className={`promo-carousel${primary ? " promo-carousel-primary" : ""}`}
    role="region" aria-roledescription={t("carrousel")} aria-label={t(label)}
    onPointerEnter={(event) => { if (event.pointerType === "mouse") { hover.current = true; setInteracting(true); } }}
    onPointerLeave={() => { hover.current = false; setInteracting(focused.current); }}
    onFocusCapture={() => { focused.current = true; setInteracting(true); }}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { focused.current = false; setInteracting(hover.current); } }}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
      }
    }}>
    <div className="promo-carousel-artwork"
      onPointerDown={(event) => { pointer.current = { x: event.clientX, y: event.clientY }; swiped.current = false; setInteracting(true); }}
      onPointerUp={(event) => {
        if (pointer.current) {
          const dx = event.clientX - pointer.current.x;
          const dy = event.clientY - pointer.current.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; move(dx < 0 ? 1 : -1); }
        }
        pointer.current = null; setInteracting(hover.current || focused.current);
      }}
      onPointerCancel={() => { pointer.current = null; setInteracting(hover.current || focused.current); }}
      onClickCapture={(event) => { if (swiped.current) { event.preventDefault(); swiped.current = false; } }}>
      {slides.map((slide, index) => {
        const className = `promo-carousel-slide${primary && slide.src === "/promotions/galaxy.png" ? " promo-carousel-slide-galaxy" : ""}${index === active % slides.length ? " is-active" : ""}`;
        const image = <Image src={slide.src} alt={slide.alt} fill unoptimized={false}
          sizes={primary ? "(max-width: 900px) 100vw, (max-width: 1440px) 72vw, 940px" : "(max-width: 390px) 100vw, 360px"}
          preload={primary && index === 0} loading={primary && index === 0 ? undefined : "lazy"} draggable={false} />;
        return slide.href ? <Link key={slide.id ?? slide.src} href={slide.href} className={className}
          aria-label={`${t("Découvrir")} ${slide.name}`} aria-hidden={index !== active % slides.length} tabIndex={index === active % slides.length ? 0 : -1} draggable={false}>{image}</Link>
          : <div key={slide.id ?? slide.src} className={className} aria-hidden={index !== active % slides.length}>{image}</div>;
      })}
    </div>
    <div className="promo-carousel-controls">
      <button type="button" aria-label={`${t(label)} : ${t("précédent")}`} onClick={() => move(-1)}><ChevronLeft size={19} /></button>
      <div className="promo-carousel-dots">{slides.map((slide, index) => <button key={slide.id ?? slide.src} type="button"
        aria-label={`${t("Afficher")} ${slide.name}`} aria-current={index === active % slides.length ? "true" : undefined}
        onClick={() => setActive(index)}><span /></button>)}</div>
      <button type="button" aria-label={`${t(label)} : ${t("suivant")}`} onClick={() => move(1)}><ChevronRight size={19} /></button>
    </div>
  </div>;
}
