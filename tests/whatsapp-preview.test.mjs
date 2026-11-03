import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicPreviewCache,publicPreviewCacheKey} from '../lib/public-preview-cache.ts';
import {createWhatsappPreviewWarmup,whatsappPreviewPath} from '../lib/whatsapp-preview.ts';

test('public preview cache deduplicates pending work, reuses ready bytes and expires safely',async()=>{
 let time=0,calls=0,finish;
 const cache=createPublicPreviewCache(2,100,()=>time);
 const load=()=>{calls++;return new Promise(resolve=>finish=resolve)};
 const first=cache.get('a:v1',load),concurrent=cache.get('a:v1',load);
 await Promise.resolve();assert.equal(calls,1);const bytes=Buffer.from('same public photo');finish(bytes);
 assert.equal((await first).status,'miss');assert.equal((await concurrent).status,'coalesced');
 assert.equal((await cache.get('a:v1',()=>{throw Error('must not regenerate')})).value,bytes);
 time=101;assert.equal((await cache.get('a:v1',async()=>{calls++;return bytes})).status,'miss');assert.equal(calls,2);
 await cache.get('b',async()=>bytes);await cache.get('c',async()=>bytes);
 assert.equal((await cache.get('a:v1',async()=>bytes)).status,'miss');
});
test('new photo revisions and products stay independent; failures and missing products are not cached',async()=>{
 const cache=createPublicPreviewCache();let failed=0;
 for(let i=0;i<2;i++)await assert.rejects(cache.get('missing',async()=>{failed++;throw Error('404')}),/404/);
 assert.equal(failed,2);
 const a=publicPreviewCacheKey('produit-a','1234567890abcdef'),b=publicPreviewCacheKey('produit-a','abcdef1234567890');
 assert.notEqual(a,b);assert.notEqual(a,publicPreviewCacheKey('produit-b','1234567890abcdef'));
 assert.equal(publicPreviewCacheKey('a','arbitrary tracking query'),publicPreviewCacheKey('a',null));
 assert.equal((await cache.get(a,async()=> 'photo A')).value,'photo A');
 assert.equal((await cache.get(b,async()=> 'new photo A')).value,'new photo A');
});
test('warming uses only this product exact versioned OG endpoint, never external or another product URL',()=>{
 const path='/produit/produit-a/partage.jpg';
 assert.equal(whatsappPreviewPath('produit-a',`https://www.goelec.ma${path}?v=1234567890abcdef`),`${path}?v=1234567890abcdef`);
 for(const input of ['https://evil.example/photo.jpg','https://www.goelec.ma/produit/b/partage.jpg','javascript:alert(1)',null])assert.equal(whatsappPreviewPath('produit-a',input),path);
});
test('idle warmup, hover and click reuse one request without File/Blob conversion',async()=>{
 let calls=0,finish;const options=[];
 const warm=createWhatsappPreviewWarmup('a',()=> 'https://www.goelec.ma/produit/a/partage.jpg?v=1234567890abcdef',async(url,init)=>{
  calls++;assert.equal(url,'/produit/a/partage.jpg?v=1234567890abcdef');options.push(init);
  return new Promise(resolve=>finish=()=>resolve(new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}})));
 });
 const idle=warm.prepare(),hover=warm.prepare(),click=warm.prepare();await Promise.resolve();assert.equal(calls,1);finish();
 assert.deepEqual(await Promise.all([idle,hover,click]),[true,true,true]);assert.equal(await warm.prepare(),true);assert.equal(calls,1);
 assert.equal(options[0].cache,'force-cache');assert.equal(options[0].priority,'low');assert.equal(options[0].credentials,'omit');
});
test('warm failures do not block sharing and can retry; new image revisions are fetched independently',async()=>{
 let calls=0,revision='1234567890abcdef';
 const warm=createWhatsappPreviewWarmup('a',()=>`https://www.goelec.ma/produit/a/partage.jpg?v=${revision}`,async()=>{
  calls++;return calls===1?new Response(null,{status:503}):new Response('photo',{headers:{'content-type':'image/jpeg'}});
 });
 assert.equal(await warm.prepare(),false);assert.equal(await warm.prepare(),true);assert.equal(calls,2);
 revision='abcdef1234567890';assert.equal(await warm.prepare(),true);assert.equal(calls,3);
});
test('unmount cancellation aborts only the background warmup',async()=>{
 const warm=createWhatsappPreviewWarmup('a',()=>null,async(url,init)=>new Promise((resolve,reject)=>{
  init.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});
 }));
 const pending=warm.prepare();await Promise.resolve();warm.cancel();assert.equal(await pending,false);
});
