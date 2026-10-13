import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = new URL("../supabase/migrations/202610090001_initial_commerce.sql", import.meta.url);
const checkoutPath = new URL("../supabase/migrations/202610090002_secure_checkout.sql", import.meta.url);
const workflowPath = new URL("../supabase/migrations/202610090003_order_workflow.sql", import.meta.url);

test("commerce migration contains every required protected table", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const tables = ["profiles","categories","brands","products","product_categories","product_images","attributes","attribute_options","category_attributes","product_attribute_values","product_variants","inventory","inventory_movements","addresses","carts","cart_items","favorites","orders","order_items","payments","shipping_methods","shipments","promotions","promotion_products","promotion_categories","promotion_redemptions","reviews","store_settings","media_assets","admin_audit_logs"];
  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\s*\\(`, "i"), `${table} table is missing`);
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"), `${table} RLS is missing`);
  }
});

test("privileged primitives are protected", async () => {
  const [schema, checkout] = await Promise.all([readFile(migrationPath, "utf8"), readFile(checkoutPath, "utf8")]);
  assert.match(schema, /create trigger profiles_protect_role/i);
  assert.match(schema, /create policy products_public_read[\s\S]*published_at is not null/i);
  assert.match(schema, /create policy favorites_own/i);
  assert.match(schema, /product-images/);
  assert.match(checkout, /for update/i, "checkout must lock inventory");
  assert.match(checkout, /revoke all on function public\.create_order_from_cart[\s\S]*from public, anon, authenticated/i);
  assert.match(checkout, /grant execute[\s\S]*to service_role/i);
});

test("seed contains no products", async () => {
  const seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  assert.doesNotMatch(seed, /insert\s+into\s+public\.products/i);
  assert.match(seed, /materiel-electrique/);
  assert.match(seed, /category_attributes/);
});

test("order workflow locks stock and records physical movements", async () => {
  const sql = await readFile(workflowPath, "utf8");
  assert.match(sql, /create or replace function public\.admin_update_order_status/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /insert into public\.inventory_movements/i);
  assert.match(sql, /if not public\.is_staff\(\)/i);
});
