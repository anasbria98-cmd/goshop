import test from 'node:test';
import assert from 'node:assert/strict';
import {productColorsSchema,visibleProductColors} from '../lib/product-colors.ts';
const legacy=[{colorName:'Noir',colorHex:'#111111'}];
test('Display-only colors support custom HEX values and no arbitrary row limit',()=>{
 const colors=Array.from({length:150},(_,i)=>({name:`Nuance ${i}`,hex:'#a1B2c3'}));
 assert.equal(productColorsSchema.parse({enabled:true,colors}).colors.length,150);
 assert.deepEqual(visibleProductColors({enabled:true,colors},legacy),colors);
 assert.equal(productColorsSchema.safeParse({enabled:true,colors:[{name:'',hex:'#fff'}]}).success,false);
 assert.equal(productColorsSchema.safeParse({enabled:true,colors:[{name:'X',hex:'url(secret)'}]}).success,false);
});
test('Explicit disabled/empty colors hide all card swatches; untouched products preserve variants',()=>{
 assert.deepEqual(visibleProductColors(null,legacy),[{name:'Noir',hex:'#111111'}]);
 assert.deepEqual(visibleProductColors({enabled:false,colors:[{name:'Bleu',hex:'#123456'}]},legacy),[]);
 assert.deepEqual(visibleProductColors({enabled:true,colors:[]},legacy),[]);
 assert.deepEqual(visibleProductColors({invalid:true},legacy),[]);
});
