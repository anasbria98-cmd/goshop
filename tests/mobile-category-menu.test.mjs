import test from 'node:test';
import assert from 'node:assert/strict';
import { mobileCategoryTree, toggleMobileCategory } from '../lib/mobile-category-menu.ts';

const categories = [
  {id:'lighting',name:'Éclairage',path:'eclairage',parentId:null},
  {id:'interior',name:'Intérieur',path:'eclairage/interieur',parentId:'lighting'},
  {id:'exterior',name:'Extérieur',path:'eclairage/exterieur',parentId:'lighting'},
  {id:'garden',name:'Applique jardin',path:'eclairage/exterieur/applique-jardin',parentId:'exterior'},
  {id:'spot',name:'Spot au sol',path:'eclairage/exterieur/applique-jardin/spot-au-sol',parentId:'garden'},
  {id:'projector',name:'Projecteur',path:'eclairage/exterieur/projecteur',parentId:'exterior'},
  {id:'cables',name:'Câbles',path:'cables',parentId:null},
];
test('Mobile tree preserves supplied database order, hierarchy, names and full links at every depth',()=>{
  const tree = mobileCategoryTree(categories);
  assert.deepEqual(tree.map(x=>x.id),['lighting','cables']);
  assert.deepEqual(tree[0].children.map(x=>x.id),['interior','exterior']);
  assert.deepEqual(tree[0].children[1].children.map(x=>x.id),['garden','projector']);
  assert.equal(tree[0].children[1].children[0].children[0].href,'/categorie/eclairage/exterieur/applique-jardin/spot-au-sol');
  assert.equal(tree[0].children[1].children[1].name,'Projecteur');
  assert.deepEqual(tree[1].children,[]);
  assert.deepEqual(categories[0],{id:'lighting',name:'Éclairage',path:'eclairage',parentId:null});
});
test('Mobile tree does not invent categories or promote orphans, inactive-parent descendants or cycles',()=>{
  assert.deepEqual(mobileCategoryTree([]),[]);
  const tree = mobileCategoryTree([
    {id:'orphan',name:'Unavailable parent',path:'missing/child',parentId:'missing'},
    {id:'self',name:'Self cycle',path:'self',parentId:'self'},
    {id:'a',name:'Cycle A',path:'a',parentId:'b'},
    {id:'b',name:'Cycle B',path:'b',parentId:'a'},
    categories[6],
  ]);
  assert.deepEqual(tree.map(x=>x.id),['cables']);
});
test('Opening a category opens only that node; collapsing closes its descendants and preserves siblings',()=>{
  const tree = mobileCategoryTree(categories),lighting=tree[0],exterior=lighting.children[1],garden=exterior.children[0];
  const initial = new Set();
  const first = toggleMobileCategory(initial,lighting);
  assert.deepEqual([...first],['lighting']);
  assert.equal(initial.size,0);
  const nested = toggleMobileCategory(toggleMobileCategory(first,exterior),garden);
  assert.deepEqual([...nested],['lighting','exterior','garden']);
  const withSibling = new Set([...nested,'interior']);
  assert.deepEqual([...toggleMobileCategory(withSibling,exterior)],['lighting','interior']);
  assert.deepEqual([...toggleMobileCategory(nested,lighting)],[]);
});
