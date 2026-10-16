import test from 'node:test';
import assert from 'node:assert/strict';
import { recentProductIds, rememberProduct, rankSimilarProducts, productShareLinks } from '../lib/product-page-model.ts';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('recent views are bounded, deduplicated, newest first and tolerate malformed storage', () => {
  const list = Array.from({length:15},(_,i)=>id(i));
  assert.equal(recentProductIds([...list,id(0),'bad',null]).length,10);
  assert.deepEqual(recentProductIds({}),[]);
  assert.deepEqual(rememberProduct([id(1),id(2),id(1)],id(2)),[id(2),id(1)]);
  assert.deepEqual(recentProductIds(['bad',null,id(1),id(1)]),[id(1)]);
});
test('similar products exclude current/unrelated products and prioritize the primary subcategory with max eight', () => {
  const current={id:'current',category:{id:'leaf'},categoryIds:['leaf','parent']};
  const candidates=[current,{id:'other',categoryIds:['other']},...Array.from({length:12},(_,i)=>({id:String(i),categoryIds:[i%2?'leaf':'parent']}))];
  const result=rankSimilarProducts(candidates,current);
  assert.equal(result.length,8); assert.ok(!result.some(p=>['current','other'].includes(p.id)));
  assert.ok(result.slice(0,6).every(p=>p.categoryIds.includes('leaf')));
  assert.equal(candidates.length,14);
});
test('sharing encodes the exact current URL and WhatsApp product name without fake Instagram URLs', () => {
  const url='https://www.goelec.ma/produit/prise?x=a&y=b#couleur';
  const links=productShareLinks(url,'Prise & interrupteur');
  assert.equal(new URL(links.facebook).searchParams.get('u'),url);
  assert.equal(new URL(links.whatsapp).searchParams.get('text'),`Prise & interrupteur\n${url}`);
  assert.equal(Object.hasOwn(links,'instagram'),false);
});
