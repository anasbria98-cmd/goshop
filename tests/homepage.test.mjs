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
