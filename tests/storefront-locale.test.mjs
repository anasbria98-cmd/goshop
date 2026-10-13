import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../lib/storefront-locale.ts';

test('French interface text retains exact spacing and punctuation', () => {
  for (const value of [' Mon panier ', 'Réf. GO ELEC :', 'Toutes les catégories', '2 PRODUITS DANS CET UNIVERS']) assert.equal(translate(value, 'fr'), value);
});
test('Arabic localizes interface and dynamic catalogue headings without altering identifiers', () => {
  assert.equal(translate('Mon panier', 'ar'), 'سلتي');
  assert.equal(translate('12 PRODUITS DANS CET UNIVERS', 'ar'), '12 منتج في هذا القسم');
  assert.equal(translate('Résultats pour « H07VU »', 'ar'), 'نتائج البحث عن « H07VU »');
  for (const name of ['Schneider Electric', 'Omega', 'LAP Galaxy', 'R9PRA240', 'HAGER Interrupteur différentiel SanVis 63A 30mA']) assert.equal(translate(name, 'ar'), name);
});
