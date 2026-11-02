import test from 'node:test';
import assert from 'node:assert/strict';
import {absoluteShareImage,productShareImage,productShareDescription,productSharingMetadata,DEFAULT_PRODUCT_SHARE_IMAGE} from '../lib/product-sharing.ts';
const base={name:'Produit réel',slug:'produit-reel',brand:'GO ELEC',sku:'REF-1',imageUrl:'https://storage.example/main.jpg',images:[{url:'https://storage.example/main.jpg',alt:'Main'},{url:'https://storage.example/gallery.jpg',alt:'Gallery'}],shortDescription:'<p>Matériel &amp; qualité</p>',description:null};
test('each product gets its own absolute Open Graph/Twitter image and canonical URL',async()=>{
 const a=productSharingMetadata(base,await productShareImage(base,async()=> 'available'));
 const other={...base,name:'Deuxième produit',slug:'deuxieme-produit',imageUrl:'https://storage.example/other.png',images:[{url:'https://storage.example/other.png',alt:'Other'}]};
 const b=productSharingMetadata(other,await productShareImage(other,async()=> 'available'));
 assert.equal(a.openGraph.images[0].url,base.imageUrl);assert.notEqual(a.openGraph.images[0].url,b.openGraph.images[0].url);
 assert.equal(a.openGraph.title,base.name);assert.equal(a.twitter.title,base.name);assert.equal(a.twitter.card,'summary_large_image');assert.equal(a.twitter.images[0].url,a.openGraph.images[0].url);assert.equal(a.openGraph.url,'https://www.goelec.ma/produit/produit-reel');assert.equal(a.alternates.canonical,a.openGraph.url);assert.equal(a.openGraph.type,'website');
});
test('main image wins over gallery, but confirmed missing main selects first working gallery',async()=>{
 const visited=[];const image=await productShareImage(base,async url=>{visited.push(url);return url===base.imageUrl?'missing':'available';});
 assert.equal(image,base.images[1].url);assert.deepEqual(visited,base.images.map(i=>i.url));
 const ordered={...base,images:[...base.images,{url:'https://storage.example/third.jpg',alt:'Third'}]};
 assert.equal(await productShareImage(ordered,async url=>url.endsWith('third.jpg')?'available':'missing'),'https://storage.example/third.jpg');
});
test('only truly absent/invalid images fall back to the site image; transient errors preserve a real photo',async()=>{
 assert.equal(await productShareImage({...base,imageUrl:null,images:[]},async()=>{throw Error('must not probe')}),DEFAULT_PRODUCT_SHARE_IMAGE);
 assert.equal(await productShareImage(base,async()=> 'missing'),DEFAULT_PRODUCT_SHARE_IMAGE);
 assert.equal(await productShareImage(base,async()=>{throw Error('timeout')}),base.imageUrl);
 assert.equal(await productShareImage(base,async url=>url===base.imageUrl?'unknown':'available'),base.images[1].url);
 assert.equal(await productShareImage({...base,images:[]},async()=> 'available'),base.imageUrl);
});
test('metadata normalizes URLs and uses plain verified description, then real product information',()=>{
 assert.equal(absoluteShareImage('/products/example.png'),'https://www.goelec.ma/products/example.png');
 for(const value of ['','javascript:alert(1)','data:image/png;base64,abc','https://user:password@example.com/p.png'])assert.equal(absoluteShareImage(value),null);
 assert.equal(productShareDescription(base),'Matériel & qualité');
 assert.equal(productShareDescription({...base,shortDescription:' ',description:'<p>Description complète &#233;lectrique</p><script>bad()</script>'}),'Description complète électrique');
 assert.match(productShareDescription({...base,shortDescription:null,description:null}),/Produit réel.*GO ELEC.*REF-1/);
});
