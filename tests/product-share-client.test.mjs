import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {copyProductShare,createProductSharePhoto,mobilePhotoSharingAvailable,nativeProductShareData} from '../lib/product-share-client.ts';
import {productShareLinks} from '../lib/product-page-model.ts';

test('the three button flows retain each product name, canonical URL and native photo',async()=>{
 const hashes=[];
 for(const [slug,name,color] of [['article-a','Produit A','#d52525'],['article-b','Produit B','#2255dd'],['nouvel-article','Nouveau produit','#33aa55']]){
  const bytes=await sharp({create:{width:1200,height:630,channels:3,background:color}}).jpeg().toBuffer();
  let calls=0;
  const prepared=createProductSharePhoto(slug,async(url,options)=>{
   calls++;assert.equal(url,`/produit/${slug}/partage.jpg`);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
   return new Response(bytes,{headers:{'content-type':'image/jpeg'}});
  });
  assert.equal(calls,0);assert.equal(prepared.peek(),null);assert.equal(prepared.settled(),false);
  const [photo,again]=await Promise.all([prepared.prepare(),prepared.prepare()]);
  assert.equal(photo,again);assert.equal(calls,1);assert.equal(prepared.settled(),true);assert.equal(await prepared.prepare(),photo);assert.equal(calls,1);
  assert.equal(photo.name,`${slug}.jpg`);assert.equal(photo.type,'image/jpeg');assert.deepEqual(Buffer.from(await photo.arrayBuffer()),bytes);
  const data=nativeProductShareData(name,slug,photo),canonical=`https://www.goelec.ma/produit/${slug}`;
  assert.equal(data.title,name);assert.equal(data.url,canonical);assert.equal(data.text,`${name}\n${canonical}`);assert.equal(data.files[0],photo);
  const links=productShareLinks(data.url,name);
  assert.equal(new URL(links.facebook).searchParams.get('u'),canonical);
  assert.equal(new URL(links.whatsapp).searchParams.get('text'),`${name}\n${canonical}`);
  assert.deepEqual(Object.keys(links),['facebook','whatsapp']);
  hashes.push(Buffer.from(await photo.arrayBuffer()).toString('base64'));
 }
 assert.equal(new Set(hashes).size,3);
});
test('desktop uses the photo/caption fallback; mobile native sharing requires both share APIs',()=>{
 const capable={share:()=>{},canShare:()=>{},maxTouchPoints:0};
 assert.equal(mobilePhotoSharingAvailable({...capable,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)'}),false);
 assert.equal(mobilePhotoSharingAvailable({...capable,userAgent:'Mozilla/5.0 (Windows NT 10.0)'}),false);
 for(const userAgent of ['Mozilla/5.0 (iPhone)','Mozilla/5.0 (iPad)','Mozilla/5.0 (Linux; Android 15)']){
  assert.equal(mobilePhotoSharingAvailable({...capable,userAgent}),true);
  assert.equal(mobilePhotoSharingAvailable({...capable,userAgent,canShare:undefined}),false);
  assert.equal(mobilePhotoSharingAvailable({...capable,userAgent,share:undefined}),false);
 }
 assert.equal(mobilePhotoSharingAvailable({...capable,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X)',maxTouchPoints:5}),true);
});
test('Instagram clipboard fallback contains only this product name and canonical URL and reports denied access honestly',async()=>{
 const saved=[];
 for(const slug of ['produit-a','produit-b']){
  const result=await copyProductShare(slug,slug,{writeText:async text=>saved.push(text)});
  assert.equal(result.copied,true);assert.equal(result.text,`${slug}\nhttps://www.goelec.ma/produit/${slug}`);
 }
 assert.notEqual(saved[0],saved[1]);
 assert.equal((await copyProductShare('A','a')).copied,false);
 const denied=await copyProductShare('A','a',{writeText:async()=>{throw Error('denied')}});
 assert.equal(denied.copied,false);assert.equal(denied.text,'A\nhttps://www.goelec.ma/produit/a');
});
test('native photo preparation rejects HTML, fake JPEG bytes, HTTP errors and network failure',async()=>{
 for(const respond of [()=>new Response('<html>error</html>',{headers:{'content-type':'text/html'}}),()=>new Response('not jpeg',{headers:{'content-type':'image/jpeg'}}),()=>new Response(null,{status:503}),()=>{throw Error('network unavailable')}]){
  const prepared=createProductSharePhoto('real-product',async()=>respond());
  assert.equal(await prepared.prepare(),null);assert.equal(prepared.peek(),null);assert.equal(prepared.settled(),true);
 }
});

test('Instagram mobile prioritizes the actual JPEG on iPhone/iPad and retains canonical caption on Android',async()=>{
 const {instagramNativeShareData}=await import('../lib/product-share-client.ts');
 const photo=new File([new Uint8Array([255,216,255])],'product.jpg',{type:'image/jpeg'});
 for(const device of [{userAgent:'iPhone Safari',maxTouchPoints:1},{userAgent:'Macintosh Safari',maxTouchPoints:5}]){
  const payload=instagramNativeShareData('Produit A','produit-a',photo,device);
  assert.deepEqual(Object.keys(payload),['files']);assert.equal(payload.files[0],photo);
 }
 const android=instagramNativeShareData('Produit A','produit-a',photo,{userAgent:'Android Chrome',maxTouchPoints:1});
 assert.equal(android.files[0],photo);assert.equal(android.title,'Produit A');assert.equal(android.text,'Produit A\nhttps://www.goelec.ma/produit/produit-a');
 assert.equal(android.url,undefined);
});

test('desktop Instagram opens Direct synchronously and copies only the product canonical URL without any prefilled DM claim',async()=>{
 const {openInstagramDirect,INSTAGRAM_DIRECT_INBOX}=await import('../lib/product-share-client.ts');
 for(const slug of ['article-a','article-b','futur-produit']){
  const calls=[];let finish;
  const work=openInstagramDirect(slug,{writeText:text=>{calls.push(['copy',text]);return new Promise(resolve=>finish=resolve)}},url=>calls.push(['open',url]));
  assert.deepEqual(calls,[['copy',`https://www.goelec.ma/produit/${slug}`],['open',INSTAGRAM_DIRECT_INBOX]]);
  assert.equal(INSTAGRAM_DIRECT_INBOX,'https://www.instagram.com/direct/inbox/');finish();
  assert.deepEqual(await work,{copied:true,text:`https://www.goelec.ma/produit/${slug}`});
 }
});
test('Instagram Direct still opens when clipboard permission is denied and never claims copied or sent',async()=>{
 const {openInstagramDirect}=await import('../lib/product-share-client.ts');let opened=0;
 for(const clipboard of [undefined,{writeText:async()=>{throw Error('denied')}}]){
  const result=await openInstagramDirect('article',clipboard,()=>opened++);
  assert.equal(result.copied,false);assert.equal(result.text,'https://www.goelec.ma/produit/article');
 }
 assert.equal(opened,2);
});

test('mobile Instagram checks exact JPEG file support then calls native share synchronously without opening a URL or downloading',async()=>{
 const {shareInstagramPhoto}=await import('../lib/product-share-client.ts');
 const file=new File([new Uint8Array([255,216,255])],'actual-product.jpg',{type:'image/jpeg'});
 for(const userAgent of ['iPhone Safari','Android Chrome']){
  const calls=[];const pending=shareInstagramPhoto('Produit A','produit-a',file,{userAgent,maxTouchPoints:1,
   canShare:data=>{assert.deepEqual(Object.keys(data),['files']);assert.equal(data.files[0],file);calls.push('canShare');return true;},
   share:data=>{assert.equal(data.files[0],file);if(userAgent.startsWith('Android'))assert.equal(data.text,'Produit A\nhttps://www.goelec.ma/produit/produit-a');calls.push('share');return Promise.resolve();}});
  assert.deepEqual(calls,['canShare','share']);await pending;
 }
 let shares=0;assert.equal(shareInstagramPhoto('A','a',file,{userAgent:'Android',maxTouchPoints:1,canShare:()=>false,share:()=>{shares++;return Promise.resolve()}}),null);assert.equal(shares,0);
 const cancellation=new DOMException('Cancelled','AbortError');await assert.rejects(shareInstagramPhoto('A','a',file,{userAgent:'iPhone',maxTouchPoints:1,canShare:()=>true,share:()=>Promise.reject(cancellation)}),cancellation);
});
