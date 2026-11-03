import test from 'node:test';import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {socialProduct,socialCrawlerPath} from '../lib/product-social-model.ts';
import {productSocialHtml,productSharingMetadata,productShareSources} from '../lib/product-sharing.ts';
const row={id:'id',name:'Produit <réel> "A"',slug:'produit-a',sku:'A',main_image_url:'main.jpg',short_description:'Texte &amp; réel',description:null,brands:{name:'Marque'},product_images:[{storage_path:'second.jpg',sort_order:2},{storage_path:'first.jpg',sort_order:1},{storage_path:'main.jpg',sort_order:0}]};
test('crawler projection preserves main-first/gallery order without categories, variants or private records',()=>{
 const p=socialProduct(row,'https://storage.example');
 assert.deepEqual(p.images.map(i=>i.url.split('/').pop()),['main.jpg','first.jpg','second.jpg']);
 assert.equal(p.brand,'Marque');assert.equal(p.name,row.name);
 assert.ok(!('price'in p));assert.ok(!('inventory'in p));
});
test('crawler metadata equals existing shared product metadata and safely escapes catalogue text',()=>{
 const p=socialProduct(row,'https://storage.example'),$=load(productSocialHtml(p)),m=productSharingMetadata(p,productShareSources(p)[0]);
 assert.equal($('meta[property="og:title"]').attr('content'),p.name);
 assert.equal($('meta[property="og:image"]').attr('content'),m.openGraph.images[0].url);
 assert.equal($('meta[property="og:image:secure_url"]').attr('content'),m.openGraph.images[0].url);
 assert.equal($('meta[property="og:description"]').attr('content'),m.description);
 assert.equal($('meta[name="twitter:image"]').attr('content'),m.twitter.images[0].url);
 assert.equal($('link[rel="canonical"]').attr('href'),m.alternates.canonical);
 assert.equal($('script').length,0);assert.equal($('meta[property="og:image:width"]').attr('content'),'1200');
 assert.notEqual($('meta[property="og:image"]').attr('content'),load(productSocialHtml({...p,slug:'b',images:[{url:'https://storage.example/b.jpg',alt:'B'}],imageUrl:null}))('meta[property="og:image"]').attr('content'));
});
test('only public product GET/HEAD social crawlers take the fast path; browsers, RSC and admin do not',()=>{
 for(const ua of ['WhatsApp/2.24.1','facebookexternalhit/1.1','Mozilla/5.0 (compatible; Facebot/1.0)'])assert.equal(socialCrawlerPath('/produit/a',ua,'GET',false),true);
 for(const [path,ua,method,rsc] of [['/admin','WhatsApp/2','GET',false],['/produit/a','Chrome','GET',false],['/produit/a','Googlebot','GET',false],['/produit/a','WhatsApp/2','POST',false],['/produit/a','WhatsApp/2','GET',true],['/produit/a/partage.jpg','WhatsApp/2','GET',false]])assert.equal(socialCrawlerPath(path,ua,method,rsc),false);
});
