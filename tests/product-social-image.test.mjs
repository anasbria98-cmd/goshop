import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {makeProductSocialJpeg,createProductPhotoLoader,ProductPhotoError} from '../lib/product-social-image.ts';
const source='https://store.supabase.co/storage/v1/object/public/product-images/main.webp',gallery='https://store.supabase.co/storage/v1/object/public/product-images/gallery.png',fallback='https://www.goelec.ma/branding/logo.png';
const photo=async(format,color)=>sharp({create:{width:300,height:400,channels:4,background:color}})[format]().toBuffer();
test('JPEG, transparent PNG and WebP photos become small standard RGB JPEGs without alpha',async()=>{
 const outputs=[];
 for(const [format,color]of [['jpeg','#e22626'],['png',{r:30,g:180,b:40,alpha:.7}],['webp','#164ecc']]){
  const input=await photo(format,color);const output=await makeProductSocialJpeg([source],fallback,async()=>input);const meta=await sharp(output).metadata();
  assert.equal(meta.format,'jpeg');assert.equal(meta.width,1200);assert.equal(meta.height,630);assert.equal(meta.hasAlpha,false);assert.equal(meta.space,'srgb');assert.equal(meta.isProgressive,false);assert.ok(output.length<300_000);
  const {data}=await sharp(output).raw().toBuffer({resolveWithObject:true});assert.ok(data[0]>245&&data[1]>245&&data[2]>245);outputs.push(output.toString('base64'));
 }
 assert.equal(new Set(outputs).size,3);
});
test('social renderer uses gallery on missing/corrupt main, and logo only if no real photo exists',async()=>{
 const input=await photo('png','#369036');const calls=[];
 await makeProductSocialJpeg([source,gallery],fallback,async url=>{calls.push(url);if(url===source)throw new ProductPhotoError('missing');return input;});assert.deepEqual(calls,[source,gallery]);
 const corrupt=[];await makeProductSocialJpeg([source,gallery],fallback,async url=>{corrupt.push(url);return url===source?Buffer.from('not an image'):input;});assert.deepEqual(corrupt,[source,gallery]);
 const empty=[];await makeProductSocialJpeg([],fallback,async url=>{empty.push(url);return input;});assert.deepEqual(empty,[fallback]);
 const outage=[];await assert.rejects(makeProductSocialJpeg([source],fallback,async url=>{outage.push(url);throw new ProductPhotoError('unavailable');}),/unavailable/);assert.deepEqual(outage,[source]);
});
test('source loader blocks arbitrary servers, private storage and unsafe redirects without fetching them',async()=>{
 const called=[];const loader=createProductPhotoLoader('https://store.supabase.co','https://www.goelec.ma',async url=>{called.push(String(url));return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});});
 for(const url of ['http://127.0.0.1/secret','https://store.supabase.co/storage/v1/object/private/private.png','https://www.goelec.ma/produit/recursive/partage.jpg'])await assert.rejects(loader(url),/unavailable/);
 assert.deepEqual(called,[]);await assert.rejects(loader(source),/unavailable/);assert.deepEqual(called,[source]);
});
test('source loader uses unauthenticated image GET and rejects non-image or oversized responses',async()=>{
 let options;const bytes=await photo('webp','#8844cc');
 const loader=createProductPhotoLoader('https://store.supabase.co','https://www.goelec.ma',async(url,init)=>{options=init;return new Response(bytes,{headers:{'content-type':'image/webp'}});});
 assert.deepEqual(await loader(source),bytes);assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,undefined);assert.equal(options.headers.Cookie,undefined);
 for(const response of [new Response('<html>blocked</html>',{headers:{'content-type':'text/html'}}),new Response('x',{headers:{'content-type':'image/png','content-length':String(9*1024*1024)}})]){
  await assert.rejects(createProductPhotoLoader('https://store.supabase.co','https://www.goelec.ma',async()=>response)(source),/unavailable/);
 }
 await assert.rejects(createProductPhotoLoader('https://store.supabase.co','https://www.goelec.ma',async()=>new Response(null,{status:404}))(source),/missing/);
});
