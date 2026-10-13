import fs from "node:fs/promises";
import dns from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";
import * as cheerio from "cheerio";
import { clean, sourceCategories, normalizeBrand } from "./common.mjs";
dns.setDefaultResultOrder("ipv4first");
setGlobalDispatcher(new Agent({ allowH2: true, connect: { timeout: 30000 } }));
const output = process.argv[2] || "/tmp/goshop-123elec.json";
const jsonLD = ($) => $('script[type="application/ld+json"]').toArray().flatMap((e) => { try { const data = JSON.parse($(e).text()); return data["@graph"] || [data]; } catch { return []; } });
async function read(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const $ = cheerio.load(await response.text());
  $("script:not([type='application/ld+json']),style,noscript").remove();
  return $;
}
const products = new Map();
const pages = [];
for (const source of sourceCategories) {
  const pending = [source.url];
  const seen = new Set();
  while (pending.length) {
    const url = pending.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const $ = await read(url);
    const items = jsonLD($).flatMap((x) => x.mainEntity?.itemListElement || []);
    if (!items.length) throw new Error(`No structured products on ${url}`);
    pages.push({ url, products: items.length });
    for (const item of items) {
      const productUrl = item.offers?.url;
      if (!productUrl || new URL(productUrl).hostname !== "www.123elec.com") throw new Error("Invalid product URL");
      if (products.has(productUrl)) products.get(productUrl).source.categoryUrls.push(source.url);
      else products.set(productUrl, { item, path: source.path, source: { type: "123elec", url: productUrl, categoryUrls: [source.url] } });
    }
    $("a[href]").each((_, element) => {
      const href = new URL($(element).attr("href"), url);
      const base = new URL(source.url);
      if (href.origin === base.origin && href.pathname === base.pathname && /^\d+$/.test(href.searchParams.get("p") || "")) {
        const pageUrl = `${base.href}?p=${href.searchParams.get("p")}`;
        if (!seen.has(pageUrl)) pending.push(pageUrl);
      }
    });
  }
}
const results = [];
const failures = [];
for (const [url, record] of products) {
  try {
    const $ = await read(url);
    const item = jsonLD($).find((x) => x["@type"] === "Product");
    if (!item) throw new Error("Missing product structured data");
    const specs = $("table tr").toArray().map((e) => [clean($(e).find("th").text()), clean($(e).find("td").text())]).filter(([k, v]) => k && v);
    const reference = specs.find(([k]) => /référence fabricant/i.test(k))?.[1];
    if (!reference) throw new Error("No explicit manufacturer reference");
    const brand = specs.find(([k]) => /^marque$/i.test(k))?.[1] || item.brand?.name;
    const characteristics = specs.filter(([k]) => !/référence fabricant|gencode|marque/i.test(k)).map(([k, v]) => `${k} : ${v}`).join("\n");
    // Use factual technical information, not the source retailer's marketing prose or reviews.
    const technical = $("#description li").toArray().map((e) => clean($(e).text())).filter((t) => t.includes(":"));
    const description = [...new Set([clean(item.name), ...technical, characteristics])].filter(Boolean).join("\n");
    let images = Array.isArray(item.image) ? item.image : [item.image];
    images = images.filter((x) => typeof x === "string" && x.startsWith("https://") && !x.includes("placeholder"));
    const price = Number(item.offers?.price);
    const currency = item.offers?.priceCurrency;
    if (!Number.isFinite(price) || price < 0 || currency !== "EUR") throw new Error("Unreliable price/currency");
    results.push({ name: clean(item.name), reference, brand: normalizeBrand(brand), path: record.path, description, characteristics, images, price, currency, source: { ...record.source, retailerSku: item.sku, price, currency, retrievedAt: new Date().toISOString() } });
  } catch (error) { failures.push({ url, error: error.message }); }
  console.log(`Read ${results.length + failures.length}/${products.size}`);
}
await fs.writeFile(output, JSON.stringify({ pages, products: results, failures }, null, 2));
console.log(JSON.stringify({ output, pages, products: results.length, failures }));
