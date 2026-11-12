import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root={id:'appareillage',name:'Appareillage / Interrupteurs & prises',slug:'appareillage',path:'appareillage',parentId:null,description:null};
const lap={id:'lap',name:'Lap',slug:'lap',path:'appareillage/lap',parentId:root.id,description:null};
const categories=[root,lap,...['galaxy','millenium','omega','optimo','aqua'].map(slug=>({id:slug,name:slug[0].toUpperCase()+slug.slice(1),slug,path:`${lap.path}/${slug}`,parentId:lap.id})),{id:'schneider',name:'Schneider',slug:'schneider',path:'appareillage/schneider',parentId:root.id}];
const products=[{id:'p1',sku:'20218',name:'Prise de courant 2P Galaxy',slug:'prise-de-courant-2p',variants:[{id:'existing-variant'}]},{id:'p2',sku:'20219',name:'Prise de courant 2P + Terre Galaxy',slug:'prise-de-courant-2p-terre'},{id:'p3',sku:'20955',name:'Double Prise 2 P + TERRE Millenium',slug:'double-prise-2-p-terre-millenium'}];
const filters=[{slug:'existing-filter'}],params=path=>({params:Promise.resolve({slug:path.split('/')})});
async function load(list=products,cats=categories){
 let props;
 const source=await readFile(new URL('../app/categorie/[...slug]/page.tsx',import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}),exports={};
 const mocks={
  'next/navigation':{notFound(){throw new Error('NOT_FOUND');}},
  'next/link':{default:({href,children,...rest})=>React.createElement('a',{href,...rest},children)},
  '@/components/catalog-view':{CatalogView:p=>{props=p;return React.createElement('main',null,React.createElement('h1',null,p.title||p.category.name),p.categoryContent);}},
  '@/lib/catalog':{getCategories:async()=>cats,getProducts:async(q,known)=>{assert.ok(cats.some(c=>c.path===q.categoryPath.join('/')));assert.equal(known,cats);return list;},getCategoryFilters:async id=>{assert.equal(id,root.id);return filters;}},
 };
 new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);
 return {...exports,props:()=>props};
}
test('Appareillage keeps broad intent, established canonical and indexability without optimizing brand/range pages for the same generic keyword',async()=>{
 const mod=await load(),meta=await mod.generateMetadata(params(root.path));
 assert.equal(meta.title,'Appareillage électrique : prises et interrupteurs au Maroc');
 assert.match(meta.description,/LAP/);assert.match(meta.description,/Galaxy, Millenium, Optimo et Aqua/);
 assert.equal(meta.alternates.canonical,'https://www.goelec.ma/categorie/appareillage');assert.equal(meta.robots,undefined);
 const brand=await mod.generateMetadata(params(lap.path));assert.equal(brand.title,'Lap');assert.equal(brand.alternates.canonical,'https://www.goelec.ma/categorie/appareillage/lap');
 const html=renderToStaticMarkup(await mod.default(params(lap.path)));
 assert.equal(mod.props().title,undefined);assert.equal(mod.props().categoryContent,undefined);assert.doesNotMatch(html,/application\/ld\+json/);
});
test('Appareillage content links to verified records and preserves products, variants, category and filters unchanged',async()=>{
 const mod=await load(),html=renderToStaticMarkup(await mod.default(params(root.path)));
 assert.equal(mod.props().products,products);assert.equal(mod.props().availableFilters,filters);assert.equal(mod.props().category,root);
 assert.equal(mod.props().title,'Appareillage électrique : interrupteurs et prises');assert.equal((html.match(/<h1>/g)||[]).length,1);
 for(const p of products)assert.ok(html.includes(`/produit/${p.slug}`));
 for(const c of categories.filter(c=>c.id==='lap'||['galaxy','millenium','optimo','aqua'].includes(c.slug)))assert.ok(html.includes(`/categorie/${c.path}`));
 assert.ok(html.includes('Pour choisir une prise électrique'));assert.ok(html.includes('Distinguez les prises de courant des prises réseau ou télévision'));
 assert.doesNotMatch(html,/\/omega|\/schneider|Hager|Ingelec|Legrand|IP[0-9]|16 A|certifié|livraison|AggregateRating|Offer/);
 const schema=JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
 assert.equal(schema['@type'],'BreadcrumbList');assert.deepEqual(schema.itemListElement.map(x=>[x.position,x.name]),[[1,'Accueil'],[2,root.name]]);
 assert.equal(schema.itemListElement[1].item,'https://www.goelec.ma/categorie/appareillage');
});
test('removed catalogue records cannot leave hardcoded product or range URLs in contextual copy',async()=>{
 const mod=await load([], [root]);const html=renderToStaticMarkup(await mod.default(params(root.path)));
 assert.doesNotMatch(html,/\/produit\/|\/lap|Quelques exemples/);
});
test('approved Goulotte and Disjoncteur metadata stay unchanged',async()=>{
 const mod=await load();
 assert.equal((await mod.generateMetadata(params('gaines-conduits/goulotte'))).title,'Goulotte électrique perforée Ingelec au Maroc');
 assert.equal((await mod.generateMetadata(params('materiel-electrique/disjoncteur-interrupteur'))).title,'Disjoncteur Hager et Schneider Electric au Maroc');
});
