import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppareillage, cartLineKey, selectProductVariant, initialProductVariant, resolveCartProduct } from '../lib/product-variants.ts';
import { colorVariantListSchema } from '../lib/variant-input.ts';

const white = { id:'00000000-0000-4000-8000-000000000001', name:'Blanc · Mat', colorName:'Blanc', colorHex:'#ffffff', finish:'Mat', sku:'SW-W', barcode:'1001', price:45, compareAtPrice:null, stock:2, imageUrl:'/white.png' };
const black = { ...white, id:'00000000-0000-4000-8000-000000000002', colorName:'Noir', sku:'SW-B', stock:0, price:60, imageUrl:'/black.png' };
const product = { id:'p1', name:'Interrupteur', sku:'SW', price:30, stock:10, imageUrl:'/original.png', hasColorVariants:true, variants:[white,black] };

test('Appareillage scope follows descendants and secondary assignments, never other roots', () => {
  const categories = [{id:'a',slug:'appareillage',parent_id:null},{id:'lap',slug:'lap',parent_id:'a'},{id:'galaxy',slug:'galaxy',parent_id:'lap'},{id:'e',slug:'eclairage',parent_id:null}];
  assert.equal(isAppareillage(['galaxy'],categories),true);
  assert.equal(isAppareillage(['e','lap'],categories),true);
  assert.equal(isAppareillage(['e'],categories),false);
  assert.equal(isAppareillage([],categories),false);
  assert.equal(isAppareillage(['cycle'],[{id:'cycle',slug:'x',parent_id:'cycle'}]),false);
  assert.equal(isAppareillage(['lap'],[{id:'a',slug:'appareillage',parentId:null},{id:'lap',slug:'lap',parentId:'a'}]),true);
});

test('Selecting a color uses its actual image, price, SKU and stock without mutating the base product', () => {
  const selected = selectProductVariant(product,black);
  assert.equal(selected.imageUrl,'/black.png'); assert.equal(selected.price,60); assert.equal(selected.sku,'SW-B'); assert.equal(selected.stock,0);
  assert.equal(selected.selectedVariant,black); assert.equal(selected.id,'p1');
  assert.equal(product.imageUrl,'/original.png'); assert.equal(product.price,30); assert.equal(product.sku,'SW');
});

test('Two colors remain separate cart lines across serialization; simple-product keys stay unchanged', () => {
  const a = selectProductVariant(product,white), b = selectProductVariant(product,black);
  assert.notEqual(cartLineKey(a),cartLineKey(b));
  const cart = JSON.parse(JSON.stringify({[cartLineKey(a)]:{product:a,quantity:2},[cartLineKey(b)]:{product:b,quantity:1}}));
  assert.equal(Object.keys(cart).length,2);
  for (const [key,line] of Object.entries(cart)) assert.equal(cartLineKey(line.product),key);
  assert.equal(cartLineKey({id:'simple'}),'simple');
});

test('Cart resolver rejects disabled/deleted/wrong colors and missing selection, preserving simple products', () => {
  assert.equal(resolveCartProduct(product),null);
  assert.equal(resolveCartProduct(product,'missing'),null);
  assert.equal(resolveCartProduct(product,white.id).sku,'SW-W');
  assert.equal(resolveCartProduct({...product,variants:[]},white.id),null);
  const simple = {id:'simple'}; assert.equal(resolveCartProduct(simple),simple);
});

test('Initial color prefers the original image when available and never defaults to an exhausted color while another is in stock', () => {
  assert.equal(initialProductVariant({...product,variants:[black,white]}),white);
  assert.equal(initialProductVariant({...product,imageUrl:white.imageUrl,variants:[{...black,stock:4},white]}),white);
  assert.equal(initialProductVariant({...product,imageUrl:black.imageUrl,variants:[black,white]}),white);
  assert.equal(initialProductVariant({...product,imageUrl:black.imageUrl,allowBackorder:true}),black);
  assert.equal(initialProductVariant({id:'simple'}),undefined);
});

test('Color input accepts custom names and HEX, rejects incomplete images, invalid prices/stock and duplicate SKUs', () => {
  const row = {color_name:'Champagne personnalisé',color_hex:'#b5A08c',name:'Champagne',sku:'CUSTOM',barcode:'',price:55,stock:3,expected_stock:null,image_path:'variants/image.jpg',finish:'Satiné',is_active:true};
  assert.equal(colorVariantListSchema.safeParse([row]).success,true);
  for (const patch of [{color_hex:'#nohex'}, {image_path:''},{image_path:'../../other.png'},{price:-1},{stock:-1},{stock:1.2},{color_name:''},{sku:''}]) assert.equal(colorVariantListSchema.safeParse([{...row,...patch}]).success,false);
  assert.equal(colorVariantListSchema.safeParse([row,row]).success,false);
  assert.equal(colorVariantListSchema.safeParse([]).success,true);
  assert.equal(colorVariantListSchema.safeParse([{...row,stock:null,expected_stock:-2}]).success,true,'metadata edits preserve existing backorder inventory');
});
