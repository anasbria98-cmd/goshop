import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import dns from "node:dns";
import { Agent, setGlobalDispatcher } from "undici";
import { createClient } from "@supabase/supabase-js";
import { slugify, excelProducts, newDepartments, matchProduct, priceDecision } from "./common.mjs";
dns.setDefaultResultOrder("ipv4first");
setGlobalDispatcher(new Agent({ allowH2: true, connect: { timeout: 30000 } }));
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
const apply = args.includes("--apply");
if (!args.includes("--excel") && !args.includes("--source")) throw new Error("Supply --excel FILE and/or --source JSON");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Server-only Supabase credentials required");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const checked = async (request) => { const { data, error } = await request; if (error) throw new Error(error.message); return data; };
const all = async (table) => { const rows = []; for (let offset = 0; ; offset += 1000) { const part = await checked(db.from(table).select("*").range(offset, offset + 999)); rows.push(...part); if (part.length < 1000) return rows; } };
let rows = [];
if (args.includes("--excel")) {
  const data = JSON.parse(execFileSync(process.env.PYTHON || "python3", [fileURLToPath(new URL("./read-workbook.py", import.meta.url)), option("--excel")], { encoding: "utf8" }));
  rows.push(...excelProducts(data));
}
if (args.includes("--source")) rows.push(...JSON.parse(await fs.readFile(option("--source"), "utf8")).products);
const sourceMode = args.includes("--source-pricing") ? option("--source-pricing") : undefined;
const rate = args.includes("--eur-mad-rate") ? Number(option("--eur-mad-rate")) : undefined;
const [categories, products, brands, attributes, inventories] = await Promise.all([all("categories"), all("products"), all("brands"), all("attributes"), all("inventory")]);
const report = { startedAt: new Date().toISOString(), apply, before: { categories: categories.length, products: products.length, brands: brands.length }, pricing: { sourceMode, rate }, categoriesCreated: [], categoriesUpdated: [], brandsCreated: [], brandsReused: [], imported: 0, updated: 0, unchanged: 0, imagesImported: 0, imagesReused: 0, imageIssues: [], rows: [], errors: [] };
const output = args.includes("--report") ? option("--report") : "/tmp/goshop-import-report.json";
const save = () => fs.writeFile(output, JSON.stringify(report, null, 2));
const sourceRefs = new Set();
for (const row of rows) {
  if (sourceRefs.has(row.reference.toLowerCase())) throw new Error(`Duplicate reference in batch: ${row.reference}`);
  sourceRefs.add(row.reference.toLowerCase());
  const existing = matchProduct(products, row);
  const decision = priceDecision(row, sourceMode, rate);
  report.rows.push({ reference: row.reference, name: row.name, destination: row.path, brand: row.brand, action: existing ? "existing" : "insert", productId: existing?.id, price: decision.price, status: decision.status, source: row.source, imageIssue: row.imageIssue });
}
// Persist the reviewed plan before any database mutation.
await save();
const categoryPath = (category) => category.parent_id ? `${categoryPath(categories.find((c) => c.id === category.parent_id))}/${category.slug}` : category.slug;
for (const department of newDepartments) {
  const exists = categories.find((c) => !c.parent_id && c.slug === department.slug);
  if (!exists) {
    report.categoriesCreated.push(department.name);
    const row = apply ? await checked(db.from("categories").insert({ ...department, parent_id: null, is_active: true, show_in_navigation: true }).select().single()) : { ...department, id: `planned-${department.slug}`, parent_id: null };
    categories.push(row);
  }
}
for (const [path, name] of [["cables-fils/cable-u500v", "Câble U500V H07VU"], ["cables-fils/cable-u500sv", "Câble U500SV H07VK"]]) {
  const category = categories.find((c) => categoryPath(c) === path);
  if (!category) throw new Error(`Missing existing category ${path}`);
  if (category.name !== name) { report.categoriesUpdated.push({ path, before: category.name, after: name }); if (apply) await checked(db.from("categories").update({ name }).eq("id", category.id)); category.name = name; }
}
for (const row of rows) if (!categories.some((c) => categoryPath(c) === row.path)) throw new Error(`Unknown destination ${row.path}`);
if (!apply) { await save(); console.log(JSON.stringify(report)); process.exit(0); }
let technical = attributes.find((a) => a.slug === "caracteristiques-techniques");
if (!technical && rows.some((r) => r.characteristics)) technical = await checked(db.from("attributes").insert({ name: "Caractéristiques techniques", slug: "caracteristiques-techniques", type: "text", is_filterable: false, is_searchable: true }).select().single());
async function importImage(row, product, url, position) {
  const existingImages = await checked(db.from("product_images").select("*").eq("product_id", product.id));
  const urlKey = crypto.createHash("sha256").update(url).digest("hex").slice(0, 20);
  const existingImage = existingImages.find((x) => x.storage_path.startsWith(`products/${product.id}/import-${urlKey}.`));
  if (existingImage) { report.imagesReused++; return; }
  if (new URL(url).protocol !== "https:") throw new Error("Only HTTPS images permitted");
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (Number(response.headers.get("content-length")) > 8 * 1024 * 1024) throw new Error("Image exceeds 8MB");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) throw new Error("Image exceeds 8MB");
  const kind = bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? ["jpg", "image/jpeg"] : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? ["png", "image/png"] : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" ? ["webp", "image/webp"] : null;
  if (!kind) throw new Error("Response is not a supported image");
  const path = `products/${product.id}/import-${urlKey}.${kind[0]}`;
  const { error } = await db.storage.from("product-images").upload(path, bytes, { contentType: kind[1], upsert: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(error.message);
  const primary = existingImages.length === 0 && !product.main_image_url;
  await checked(db.from("product_images").insert({ product_id: product.id, storage_path: path, alt_text: row.name, sort_order: existingImages.length + position, is_primary: primary }));
  await checked(db.from("media_assets").upsert({ bucket: "product-images", storage_path: path, file_name: `${row.reference}.${kind[0]}`, mime_type: kind[1], size_bytes: bytes.length, alt_text: row.name }, { onConflict: "bucket,storage_path" }));
  if (primary) { await checked(db.from("products").update({ main_image_url: path }).eq("id", product.id)); product.main_image_url = path; }
  report.imagesImported++;
}
for (const [index, row] of rows.entries()) {
  try {
    let brand = row.brand && brands.find((b) => slugify(b.name) === slugify(row.brand) || b.slug === slugify(row.brand));
    if (row.brand && !brand) { brand = await checked(db.from("brands").insert({ name: row.brand, slug: slugify(row.brand), is_active: true }).select().single()); brands.push(brand); report.brandsCreated.push(row.brand); }
    else if (brand && !report.brandsReused.includes(brand.name)) report.brandsReused.push(brand.name);
    let product = matchProduct(products, row);
    const decision = priceDecision(row, sourceMode, rate);
    const fields = { name: row.name, sku: row.reference, manufacturer_reference: row.reference, description: row.description || null, ...(brand ? { brand_id: brand.id } : {}), ...(row.currency === "MAD" || sourceMode === "convert" ? { price: decision.price } : {}) };
    if (!product) {
      let slug = slugify(row.name);
      if (products.some((p) => p.slug === slug)) slug = `${slug}-${slugify(row.reference)}`;
      product = await checked(db.from("products").insert({ ...fields, slug, price: decision.price, status: decision.status, published_at: decision.status === "active" ? new Date().toISOString() : null, stock_tracking: true, allow_backorder: false }).select().single());
      products.push(product); report.imported++;
    } else {
      const patch = Object.fromEntries(Object.entries(fields).filter(([key, value]) => key === "price" ? Number(product[key]) !== value : product[key] !== value));
      if (Object.keys(patch).length) { await checked(db.from("products").update(patch).eq("id", product.id)); Object.assign(product, patch); report.updated++; } else report.unchanged++;
    }
    report.rows[index].productId = product.id;
    report.rows[index].slug = product.slug;
    const category = categories.find((c) => categoryPath(c) === row.path);
    const currentPrimary = await checked(db.from("product_categories").select("category_id").eq("product_id", product.id).eq("is_primary", true));
    if (currentPrimary.some((c) => c.category_id !== category.id)) await checked(db.from("product_categories").update({ is_primary: false }).eq("product_id", product.id).eq("is_primary", true));
    const assignments = [];
    let parent = category;
    while (parent) { assignments.push({ product_id: product.id, category_id: parent.id, is_primary: parent.id === category.id }); parent = categories.find((c) => c.id === parent.parent_id); }
    await checked(db.from("product_categories").upsert(assignments, { onConflict: "product_id,category_id" }));
    if (!inventories.some((i) => i.product_id === product.id && !i.variant_id)) { const inventory = await checked(db.from("inventory").insert({ product_id: product.id, quantity: 0, reserved_quantity: 0 }).select().single()); inventories.push(inventory); }
    if (row.characteristics) {
      await checked(db.from("category_attributes").upsert({ category_id: category.id, attribute_id: technical.id, is_required: false }, { onConflict: "category_id,attribute_id" }));
      await checked(db.from("product_attribute_values").upsert({ product_id: product.id, attribute_id: technical.id, text_value: row.characteristics }, { onConflict: "product_id,attribute_id" }));
    }
    if (row.imageIssue) report.imageIssues.push({ reference: row.reference, issue: row.imageIssue });
    for (const [position, url] of row.images.entries()) { try { await importImage(row, product, url, position); } catch (error) { report.imageIssues.push({ reference: row.reference, url, issue: error.message }); } }
  } catch (error) { report.errors.push({ reference: row.reference, error: error.message }); }
  await save();
  console.log(`Processed ${index + 1}/${rows.length}: ${row.reference}`);
}
report.finishedAt = new Date().toISOString();
await save();
console.log(JSON.stringify({ report: output, imported: report.imported, updated: report.updated, unchanged: report.unchanged, imageIssues: report.imageIssues, errors: report.errors }));
if (report.errors.length) process.exitCode = 1;
