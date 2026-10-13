import test from "node:test";
import assert from "node:assert/strict";
import { excelProducts, matchProduct, priceDecision } from "../scripts/import/common.mjs";
test("Excel normalization preserves supplied MAD prices, references and descriptions", () => {
  const [product] = excelProducts([{ sheet: "Feuil1", row: 3, cells: { B: "Easy9", C: "EZ9P32610", D: "Matériel électrique, Disjoncteur et interrupteur, Shneidre", E: "image missing", F: "10 A\n230 V", G: "49.5", H: "Courbe C" } }]);
  assert.equal(product.path, "materiel-electrique/disjoncteur-interrupteur/schneider");
  assert.equal(product.price, 49.5);
  assert.equal(product.reference, "EZ9P32610");
  assert.equal(product.description, "10 A\n230 V");
  assert.deepEqual(product.images, []);
  assert.equal(product.brand, "Schneider Electric");
});
test("Unknown categories fail instead of guessing a destination", () => {
  assert.throws(() => excelProducts([{ row: 4, cells: { B: "Product", C: "X", D: "Unknown", G: "10" } }]), /needs review/);
});
test("Duplicate detection handles SKU, manufacturer reference and normalized names", () => {
  const original = { id: "a", sku: "ABC", manufacturer_reference: "123", name: "Câble bleu", slug: "cable-bleu" };
  for (const row of [{ reference: "abc", name: "New" }, { reference: "123", name: "New" }, { reference: "different", name: "Cable BLEU" }]) assert.equal(matchProduct([original], row), original);
  assert.throws(() => matchProduct([original, { ...original, id: "b" }], { reference: "ABC", name: "New" }), /Ambiguous/);
});
test("EUR prices cannot silently become MAD selling prices", () => {
  assert.throws(() => priceDecision({ currency: "EUR", price: 14.59 }), /prices are EUR/);
  assert.deepEqual(priceDecision({ currency: "EUR", price: 14.59 }, "draft"), { price: 0, status: "draft" });
  assert.deepEqual(priceDecision({ currency: "EUR", price: 14.59 }, "convert", 10.8), { price: 157.57, status: "active" });
  assert.deepEqual(priceDecision({ currency: "MAD", price: 49.5 }), { price: 49.5, status: "active" });
});
