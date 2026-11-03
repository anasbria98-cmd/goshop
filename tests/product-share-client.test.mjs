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
