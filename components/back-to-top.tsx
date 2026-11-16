"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useStorefrontLanguage } from "./storefront-language";
import styles from "./back-to-top.module.css";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const returning = useRef(false);
  const { locale } = useStorefrontLanguage();
  useEffect(() => {
    const update = () => {
      if (window.scrollY === 0) returning.current = false;
      setVisible(window.scrollY > 320 || (returning.current && window.scrollY > 0));
    };
    const frame = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  return <button
    type="button"
    className={styles.button}
    hidden={!visible}
    aria-label={locale === "ar" ? "العودة إلى أعلى الصفحة" : "Retour en haut de page"}
    onClick={() => {
      // Keep the focused control mounted until the animation finishes; hiding it
      // midway can interrupt native smooth scrolling in browsers.
      returning.current = true;
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }}
  ><ChevronUp size={22} strokeWidth={2.5} aria-hidden="true" /></button>;
}
