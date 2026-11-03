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

test('mobile JPEG is a reusable File prepared before the tap and invalidated by photo revision',async()=>{
 let calls=0,revision='1234567890abcdef';
 const warm=createWhatsappPreviewWarmup('a',()=>`https://www.goelec.ma/produit/a/partage.jpg?v=${revision}`,async()=>{
  calls++;return new Response(new Uint8Array([255,216,255,1]),{headers:{'content-type':'image/jpeg'}});
 },()=>true);
 assert.equal(warm.peekFile(),null);await warm.prepare();const file=warm.peekFile();
 assert.ok(file instanceof File);assert.equal(file.type,'image/jpeg');assert.equal(file.name,'a.jpg');
 await warm.prepare();assert.equal(warm.peekFile(),file);assert.equal(calls,1);
 revision='abcdef1234567890';assert.equal(warm.peekFile(),null);await warm.prepare();assert.notEqual(warm.peekFile(),file);
});
test('mobile rejects an HTML/error body masquerading as a JPEG',async()=>{
 const warm=createWhatsappPreviewWarmup('a',()=>null,async()=>new Response('<html>',{headers:{'content-type':'image/jpeg'}}),()=>true);
 assert.equal(await warm.prepare(),false);assert.equal(warm.peekFile(),null);
});
test('iPhone dispatches media safely; Android includes the name and canonical caption synchronously',async()=>{
 const {startWhatsappShare}=await import('../lib/whatsapp-preview.ts');
 const file=new File([new Uint8Array([255,216,255])],'a.jpg',{type:'image/jpeg'});
 for(const userAgent of ['iPhone Safari','Android Chrome']){
  let payload;const result=startWhatsappShare('Produit A','a',file,{userAgent,maxTouchPoints:1,canShare:()=>true,share:data=>{payload=data;return Promise.resolve();}},()=>assert.fail('must not open URL'));
  assert.equal(result.kind,'native');assert.equal(payload.files[0],file);
  if(userAgent.startsWith('Android'))assert.equal(payload.text,'Produit A\nhttps://www.goelec.ma/produit/a');
  else assert.deepEqual(Object.keys(payload),['files']);
  await result.completion;
 }
});
test('early mobile tap does not hand off until a photo exists; unsupported desktop retains link fallback',async()=>{
 const {startWhatsappShare}=await import('../lib/whatsapp-preview.ts');let opened=0;
 const mobile={userAgent:'iPhone',maxTouchPoints:1,canShare:()=>true,share:()=>assert.fail('no file yet')};
 assert.equal(startWhatsappShare('A','a',null,mobile,()=>opened++).kind,'prepare');assert.equal(opened,0);
 assert.equal(startWhatsappShare('A','a',null,{...mobile,userAgent:'Macintosh',maxTouchPoints:0},()=>opened++).kind,'link');assert.equal(opened,1);
 const file=new File(['photo'],'a.jpg');
 assert.equal(startWhatsappShare('A','a',file,{...mobile,canShare:()=>false},()=>opened++).kind,'link');
 assert.equal(startWhatsappShare('A','a',file,{...mobile,canShare:()=>{throw Error('unsupported')}},()=>opened++).kind,'link');assert.equal(opened,3);
});
test('native cancellation/failure never silently opens a second WhatsApp link',async()=>{
 const {startWhatsappShare}=await import('../lib/whatsapp-preview.ts');
 const file=new File(['photo'],'a.jpg');
 for(const error of [new DOMException('Cancelled','AbortError'),new Error('Share unavailable')]){
  const result=startWhatsappShare('A','a',file,{userAgent:'Android',maxTouchPoints:1,canShare:()=>true,share:()=>Promise.reject(error)},()=>assert.fail('no surprise URL handoff'));
  await assert.rejects(result.completion,error);
 }
 assert.throws(()=>startWhatsappShare('A','a',file,{userAgent:'iPhone',maxTouchPoints:1,canShare:()=>true,share:()=>{throw Error('NotAllowed')}},()=>assert.fail('no automatic popup')),/NotAllowed/);
});
