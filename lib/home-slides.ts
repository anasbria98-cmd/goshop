export type SlideLocation = "primary" | "secondary";
export type HomeSlideRow = {
  id: string; name: string; alt: string; image_url: string; location: SlideLocation;
  link_type: "none" | "category" | "product" | "custom"; category_id: string | null;
  product_id: string | null; custom_url: string | null; sort_order: number; is_active: boolean;
  created_at: string; updated_at: string;
};
export type HeroSlide = { id?: string; name: string; alt: string; src: string; href: string | null };
export const legacySlides = [
  { slug: "omega", name: "Omega", alt: "Omega — Color your way : collections Prestige, Déco et Nature", location: "primary" },
  { slug: "galaxy", name: "LAP Galaxy", alt: "LAP Galaxy — Double prise 2P+T 16A certifiée NM", location: "primary" },
  { slug: "karla", name: "Karla", alt: "Karla — L’esprit Scandinave : Metallic, Color et Design", location: "secondary" },
  { slug: "millenium", name: "LAP Millenium", alt: "LAP Millenium — Interrupteurs, poussoirs et prises décoratifs : qualité et choix de couleurs", location: "secondary" },
] as const;
export function safeSlideLink(value: string): boolean {
  if (!value || /[\s\\\u0000-\u001f]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function moveSlide<T extends { id: string }>(rows: T[], from: string, to: string): T[] {
  const start = rows.findIndex((row) => row.id === from), end = rows.findIndex((row) => row.id === to);
  if (start < 0 || end < 0) return rows;
  const result = [...rows]; const [item] = result.splice(start, 1); result.splice(end, 0, item); return result;
}
