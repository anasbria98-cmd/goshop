import test from 'node:test';
import assert from 'node:assert/strict';
import {generalVariantSchema,generalVariantListSchema,generalVariantError} from '../lib/general-variant-input.ts';
import {selectProductVariant,resolveCartProduct,cartLineKey} from '../lib/product-variants.ts';
const row={name:' 20 A ',sku:' H20 ',barcode:'',price:'42.50',compare_at_price:'50',cost_price:'12',stock:'8',low_stock_threshold:'2',is_active:true};
test('general variant validates required fields, nullable prices, quantities and duplicates',()=>{
 const parsed=generalVariantSchema.parse(row); assert.equal(parsed.name,'20 A');assert.equal(parsed.sku,'H20');assert.equal(parsed.price,42.5);
 assert.equal(generalVariantSchema.parse({...row,price:'',compare_at_price:'',cost_price:''}).price,null);
 for(const patch of [{name:' '},{sku:' '},{price:-1},{compare_at_price:2},{stock:1.5},{stock:-1},{low_stock_threshold:-1}])assert.equal(generalVariantSchema.safeParse({...row,...patch}).success,false);
 assert.equal(generalVariantListSchema.safeParse([row,row]).success,false);
 assert.match(generalVariantError({code:'23505',message:'duplicate product_variants_sku_key'}),/SKU existe/);
 assert.match(generalVariantError({code:'23505',message:'duplicate product_variants_barcode_key'}),/code-barres/);
 assert.doesNotMatch(generalVariantError(new Error('secret configuration')),/secret/);
});
test('general variant selection uses actual SKU/price/stock and separate cart keys',()=>{
 const v={id:'v',name:'20 A',sku:'H20',price:42.5,stock:8,imageUrl:'/same.png',compareAtPrice:50};
 const p={id:'p',sku:'BASE',price:30,stock:99,hasGeneralVariants:true,variants:[v]};
 assert.equal(resolveCartProduct(p),null);assert.equal(resolveCartProduct(p,'missing'),null);
 const chosen=selectProductVariant(p,v);assert.equal(chosen.sku,'H20');assert.equal(chosen.price,42.5);assert.equal(chosen.stock,8);assert.equal(cartLineKey(chosen),'p:v');assert.equal(p.sku,'BASE');
});
