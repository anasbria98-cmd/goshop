import test from 'node:test';
import assert from 'node:assert/strict';
import {homepageDepartments} from '../lib/homepage-model.ts';
test('Homepage groups descendants by full category path and hides empty departments',()=>{
 const categories=[{id:'electrical',path:'materiel-electrique',parentId:null},{id:'hager',path:'materiel-electrique/disjoncteur-interrupteur/hager',parentId:'electrical'},{id:'lighting',path:'eclairage',parentId:null},{id:'empty',path:'outillage',parentId:null}];
 const products=[{id:'breaker',categoryIds:['hager']},{id:'bulb',categoryIds:['lighting']}];
 const groups=homepageDepartments(categories,products);
 assert.deepEqual(groups.map(g=>g.category.id),['electrical','lighting']);
 assert.deepEqual(groups[0].products.map(p=>p.id),['breaker']);
 assert.deepEqual(groups[1].products.map(p=>p.id),['bulb']);
 assert.equal(products.length,2);
});
test('Homepage rails cap displayed cards while retaining the full category count',()=>{
 const products=Array.from({length:12},(_,i)=>({id:String(i),categoryIds:['cables','cables']}));
 const [group]=homepageDepartments([{id:'cables',path:'cables-fils',parentId:null}],products);
 assert.equal(group.products.length,6);assert.equal(group.count,12);
 assert.equal(new Set(group.products.map(p=>p.id)).size,6);
});

test('Philips fills four slots from the published catalogue beyond capped promotional lists', async () => {
 const {philipsCampaignProducts}=await import('../lib/homepage-model.ts');
 const p=(id)=>({id,brandSlug:'philips'});
 const existing=[p('panel'),p('12w'),p('9w')];
 const added=[p('gu10'),p('spot')];
 const catalogue=[...added,...existing,{id:'other',brandSlug:'lap'}];
 const selection=philipsCampaignProducts(catalogue,[...existing,existing[0],{id:'unpublished',brandSlug:'philips'}]);
 assert.deepEqual(selection.map(p=>p.id),['panel','12w','9w','gu10']);
 assert.equal(selection[0],existing[0]);
 assert.equal(new Set(selection.map(p=>p.id)).size,4);
 assert.deepEqual(philipsCampaignProducts([added[0]],[]),[added[0]]);
 assert.deepEqual(philipsCampaignProducts([],existing),[]);
 assert.equal(catalogue.length,6);
});
