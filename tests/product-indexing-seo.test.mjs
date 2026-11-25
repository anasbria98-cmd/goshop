import test from 'node:test';
import assert from 'node:assert/strict';
import {productIndexingSeo, productBreadcrumbSchema} from '../lib/product-indexing-seo.js';
import {productSharingMetadata, productShareDescription} from '../lib/product-sharing.ts';
const affected=[
 ['lazer-magnetique-12w','GS1020'],
 ['panel-led-rond-encastre-36w-ajustable','GOLED5301'],
 ['hager-interrupteur-differentiel-sanvis-63a-30ma-type-a-auto-230v-cds765f','CDS765F'],
 ['moniteur-7-cdv-70h2-silver','CDV-70H2'],
 ['poussoir-a-bascule-lumineux-led-millenium','10928'],
];
test('five verified products have unique factual metadata without altering canonical or sharing photo/name',()=>{
 const descriptions=new Set();
 for(const [slug,sku] of affected){
  const product={slug,sku,name:'Nom catalogue',brand:'',images:[],imageUrl:null,shortDescription:null,description:null};
  const editorial=productIndexingSeo(product);assert.ok(editorial);assert.match(editorial.title,new RegExp(sku));
  const metadata=productSharingMetadata(product,'https://storage.example/product.jpg');
  assert.equal(metadata.title,editorial.title);assert.equal(productShareDescription(product),editorial.description);
  assert.equal(metadata.alternates.canonical,'https://www.goelec.ma/produit/'+slug);
  assert.equal(metadata.openGraph.title,product.name);assert.equal(metadata.twitter.title,product.name);
  assert.match(metadata.openGraph.images[0].url,new RegExp('/produit/'+slug+'/partage.jpg'));
  assert.ok(editorial.description.length<=170);descriptions.add(metadata.description);
  assert.equal(productIndexingSeo({...product,sku:'OTHER'}),undefined,'reused slug must not inherit old specifications');
 }
 assert.equal(descriptions.size,5);
 assert.equal(productIndexingSeo({slug:'future-product',sku:'NEW'}),undefined);
});
test('breadcrumb schema matches visible home/category/product links with safe absolute www URLs',()=>{
 const product={name:'Produit "réel"',slug:'article réel',category:{name:'Catégorie',path:'eclairage/interieur'}};
 const schema=productBreadcrumbSchema(product);
 assert.equal(schema['@type'],'BreadcrumbList');
 assert.deepEqual(schema.itemListElement.map(i=>i.position),[1,2,3]);
 assert.deepEqual(schema.itemListElement.map(i=>i.item),['https://www.goelec.ma/','https://www.goelec.ma/categorie/eclairage/interieur','https://www.goelec.ma/produit/article%20r%C3%A9el']);
 assert.equal(productBreadcrumbSchema({...product,category:null}).itemListElement.length,2);
 assert.ok(!JSON.stringify(schema).includes('rating'));
});
