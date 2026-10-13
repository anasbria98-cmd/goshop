export const clean = (value) => String(value ?? "").replace(/\r\n?/g, "\n").replace(/[\t \u00a0]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
export const slugify = (value) => clean(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const categoryPaths = {
  "materiel-electrique-disjoncteur-et-interrupteur-shneidre": "materiel-electrique/disjoncteur-interrupteur/schneider",
  "gaines-et-conduits-fixation": "gaines-conduits/fixation",
  "sonorisation": "sonorisation",
  "securite-cameras": "securite/cameras",
  "security-cameras": "securite/cameras",
  "securite-controle-d-acces": "securite/controle-acces",
  "cable-u500v-h07vu": "cables-fils/cable-u500v",
};
export const newDepartments = [
  { slug: "sonorisation", name: "Sonorisation", sort_order: 81 },
  { slug: "materiel-informatique", name: "Matériel informatique", sort_order: 82 },
  { slug: "multiprise-enrouleur", name: "Multiprise et enrouleur", sort_order: 83 },
];
export const sourceCategories = [
  { url: "https://www.123elec.com/cables-gaines-conduits/cables-electriques/cables-electriques-rigides-ro2v.html", path: "cables-fils/cable-ro2v" },
  { url: "https://www.123elec.com/gamme-materiel-electrique/disjoncteurs/disjoncteurs-hager.html", path: "materiel-electrique/disjoncteur-interrupteur/hager" },
  { url: "https://www.123elec.com/gamme-materiel-electrique/interrupteurs-differentiels/interrupteurs-differentiels-hager.html", path: "materiel-electrique/disjoncteur-interrupteur/hager" },
];
export function normalizeBrand(value) {
  const normalized = slugify(value);
  return ({ schneider: "Schneider Electric", "schneider-electric": "Schneider Electric", hager: "Hager", hikvision: "Hikvision", ezviz: "EZVIZ", zkteco: "ZKTeco", lap: "LAP", nexans: "Nexans" })[normalized] || clean(value) || null;
}
export function excelProducts(rows) {
  return rows.filter(({ cells }) => clean(cells.B) && clean(cells.B) !== "Produit").map(({ sheet, row, cells }) => {
    const category = categoryPaths[slugify(cells.D)];
    const price = Number(cells.G);
    if (!category || !clean(cells.C) || !clean(cells.G) || !Number.isFinite(price) || price < 0) throw new Error(`Invalid source row ${sheet}:${row}: category/reference/price needs review`);
    const image = clean(cells.E);
    let brand = clean(cells.B).match(/\b(Schneider|Hikvision|EZVIZ|ZKTeco|Nexans)\b/i)?.[1];
    if (!brand && category === "materiel-electrique/disjoncteur-interrupteur/schneider") brand = "Schneider Electric";
    if (!brand && image.includes("lap-electric.ma/")) brand = "LAP";
    if (!brand && /nexans/i.test(image)) brand = "Nexans";
    return { name: clean(cells.B), reference: clean(cells.C), path: category, brand: normalizeBrand(brand), description: clean(cells.F), characteristics: clean(cells.H), price, currency: "MAD", images: /^https:\/\//.test(image) ? [image] : [], imageIssue: image && !/^https:\/\//.test(image) ? "Image cell is plain text" : !image ? "No image supplied" : null, source: { type: "excel", sheet, row, category: clean(cells.D), price, currency: "MAD" } };
  });
}
export function matchProduct(products, row) {
  const reference = clean(row.reference).toLowerCase();
  const refs = products.filter((p) => [p.sku, p.manufacturer_reference].some((x) => clean(x).toLowerCase() === reference));
  const matches = refs.length ? refs : products.filter((p) => slugify(p.name) === slugify(row.name) || p.slug === slugify(row.name));
  if (matches.length > 1) throw new Error(`Ambiguous existing products for ${row.reference}`);
  return matches[0] || null;
}
export function priceDecision(row, mode, rate) {
  if (row.currency === "MAD") return { price: row.price, status: "active" };
  if (mode === "convert" && Number.isFinite(rate) && rate > 0) return { price: Math.round(row.price * rate * 100) / 100, status: "active" };
  if (mode === "draft") return { price: 0, status: "draft" };
  throw new Error("123elec prices are EUR. Choose --source-pricing draft or convert --eur-mad-rate RATE explicitly.");
}
