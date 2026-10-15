export type ColorChoice = { name: string; hex: string };

const presets = [
  { name: "Blanc", hex: "#ffffff", aliases: ["white", "أبيض", "ابيض"] },
  { name: "Noir", hex: "#000000", aliases: ["black", "أسود", "اسود"] },
  { name: "Gris clair", hex: "#c8c8c8", aliases: ["light grey", "light gray"] },
  { name: "Anthracite", hex: "#383e42", aliases: ["charcoal"] },
  { name: "Aluminium", hex: "#b9bec1", aliases: ["aluminum", "silver", "argent"] },
  { name: "Champagne", hex: "#c7b38a", aliases: [] },
  { name: "Beige", hex: "#d9c7a5", aliases: [] },
  { name: "Ivoire", hex: "#fffff0", aliases: ["ivory"] },
  { name: "Gris", hex: "#888888", aliases: ["grey", "gray"] },
  { name: "Bronze", hex: "#8c6239", aliases: [] },
  { name: "Bleu", hex: "#1e5c95", aliases: ["blue", "أزرق", "ازرق"] },
  { name: "Rouge", hex: "#c43c36", aliases: ["red", "أحمر", "احمر"] },
  { name: "Marron", hex: "#8b4513", aliases: [] },
];

export function normalizeColorName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[\s_.-]+/g, " ");
}

/** Existing catalogue shades take precedence over indicative presets. */
export function colorChoices(saved: ColorChoice[], drafts: ColorChoice[] = []): ColorChoice[] {
  const unique = new Map<string, ColorChoice>();
  for (const color of [...presets, ...saved, ...drafts]) {
    if (color.name.trim() && /^#[0-9a-fA-F]{6}$/.test(color.hex)) unique.set(normalizeColorName(color.name), { name: color.name.trim(), hex: color.hex });
  }
  const order = new Set([...saved, ...drafts, ...presets].map((color) => normalizeColorName(color.name)));
  return [...order].flatMap((key) => { const color = unique.get(key); return color ? [color] : []; });
}

export function colorFromFilename(filename: string, choices: ColorChoice[]): ColorChoice | null {
  const text = ` ${normalizeColorName(filename.replace(/\.[^.]+$/, ""))} `;
  const matches: { start: number; end: number; color: ColorChoice }[] = [];
  for (const color of choices) {
    const preset = presets.find((p) => normalizeColorName(p.name) === normalizeColorName(color.name));
    for (const alias of [color.name, ...(preset?.aliases ?? [])]) {
      const word = normalizeColorName(alias);
      const start = text.indexOf(` ${word} `);
      if (start !== -1) matches.push({ start, end: start + word.length + 2, color });
    }
  }
  // "Gris clair" is one color, while "Noir + Blanc" is deliberately ambiguous.
  const specific = matches.filter((match) => !matches.some((other) => other !== match && other.start <= match.start && other.end >= match.end && other.end - other.start > match.end - match.start));
  const unique = new Map(specific.map((match) => [normalizeColorName(match.color.name), match.color]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

export function suggestVariantSku(baseSku: string, color: string, finish: string, used: string[]) {
  if (!baseSku.trim()) return "";
  const suffix = normalizeColorName([color, finish].filter(Boolean).join(" ")).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase() || "COULEUR";
  const occupied = new Set(used.map((sku) => sku.trim().toLowerCase()));
  for (let number = 1; ; number++) {
    const ending = `-${suffix.slice(0, 48)}${number === 1 ? "" : `-${number}`}`;
    const candidate = baseSku.trim().slice(0, 80 - ending.length) + ending;
    if (!occupied.has(candidate.toLowerCase())) return candidate;
  }
}

function rgb(hex: string) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

export function nearestColor(hex: string, choices: ColorChoice[]): ColorChoice {
  const sample = rgb(hex);
  let best: ColorChoice | undefined;
  let distance = Infinity;
  for (const color of choices) {
    const value = rgb(color.hex);
    const next = Math.hypot(...sample.map((channel, index) => channel - value[index]));
    if (next < distance) { best = color; distance = next; }
  }
  return { name: best && distance <= 90 ? best.name : "Couleur personnalisée", hex };
}

/** A suggestion only: ignores transparent pixels and the border background. */
export function dominantProductColor(pixels: Uint8ClampedArray, width: number, height: number): string | null {
  if (pixels.length !== width * height * 4 || width < 4 || height < 4) return null;
  const border: number[][] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    if ((x < 2 || y < 2 || x >= width - 2 || y >= height - 2) && pixels[offset + 3] > 220) border.push([...pixels.slice(offset, offset + 3)]);
  }
  const background = border.length ? [0, 1, 2].map((channel) => border.map((p) => p[channel]).sort((a, b) => a - b)[Math.floor(border.length / 2)]) : null;
  const bins = new Map<string, { weight: number; count: number; sum: number[] }>();
  let opaque = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    if (pixels[offset + 3] < 220) continue;
    opaque++;
    const color = [...pixels.slice(offset, offset + 3)];
    if (background && Math.hypot(...color.map((channel, i) => channel - background[i])) < 38) continue;
    const key = color.map((channel) => Math.floor(channel / 24)).join(",");
    const bin = bins.get(key) ?? { weight: 0, count: 0, sum: [0, 0, 0] };
    bin.weight += x > width * .2 && x < width * .8 && y > height * .2 && y < height * .8 ? 2 : 1;
    bin.count++;
    bin.sum = bin.sum.map((channel, i) => channel + color[i]);
    bins.set(key, bin);
  }
  const best = [...bins.values()].sort((a, b) => b.weight - a.weight)[0];
  if (!best || best.count < Math.max(8, opaque * .12)) return null;
  return "#" + best.sum.map((sum) => Math.round(sum / best.count).toString(16).padStart(2, "0")).join("");
}
