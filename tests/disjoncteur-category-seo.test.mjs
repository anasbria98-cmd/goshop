import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const parent={id:'parent',name:'Matériel électrique',slug:'materiel-electrique',path:'materiel-electrique',parentId:null,description:null};
const category={id:'protection',name:'Disjoncteur et interrupteur',slug:'disjoncteur-interrupteur',path:'materiel-electrique/disjoncteur-interrupteur',parentId:'parent',description:null};
const categories=[parent,category,...['schneider','hager','legrand'].map(slug=>({id:slug,name:slug==='hager'?'Hager':slug==='schneider'?'Schneider':'Legrand',slug,path:`${category.path}/${slug}`,parentId:category.id})),{id:'coffret',name:'Coffret électrique',slug:'coffret-electrique',path:'materiel-electrique/coffret-electrique',parentId:parent.id}];
const products=['MF720','EZ9P32610','GS410'].map(sku=>({id:sku,sku,name:sku,slug:`real-${sku.toLowerCase()}`}));
const filters=[{id:'existing-filter'}];
const params=path=>({params:Promise.resolve({slug:path.split('/')})});
async function load(list=products,cats=categories){
 let props;
 const source=await readFile(new URL('../app/categorie/[...slug]/page.tsx',import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 const exports={};
 const mocks={
  'next/navigation':{notFound(){throw new Error('NOT_FOUND');}},
  'next/link':{default:({href,children,...rest})=>React.createElement('a',{href,...rest},children)},
  '@/components/catalog-view':{CatalogView:p=>{props=p;return React.createElement('main',null,React.createElement('h1',null,p.title||p.category.name),p.categoryContent);}},
  '@/lib/catalog':{getCategories:async()=>cats,getProducts:async(q,known)=>{assert.deepEqual(q.categoryPath,category.path.split('/'));assert.equal(known,cats);return list;},getCategoryFilters:async id=>{assert.equal(id,parent.id);return filters;}},
 };
 new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);
 return {...exports,props:()=>props};
}
test('Disjoncteur title and description target the verified brands without changing canonical/indexability',async()=>{
 const mod=await load(),meta=await mod.generateMetadata(params(category.path));
 assert.equal(meta.title,'Disjoncteur Hager et Schneider Electric au Maroc');
 assert.equal(meta.description,'Découvrez les disjoncteurs Hager et Schneider Electric chez GO ELEC au Maroc : modèles modulaires, moteurs et différentiels. Comparez les références du catalogue.');
 assert.equal(meta.alternates.canonical,'https://www.goelec.ma/categorie/'+category.path);
 assert.equal(meta.robots,undefined);
 assert.equal((await mod.generateMetadata(params(parent.path))).title,'Matériel électrique au Maroc');
});
test('Disjoncteur content preserves original listing/filter data and links only to existing catalogue records',async()=>{
 const mod=await load(),html=renderToStaticMarkup(await mod.default(params(category.path)));
 assert.equal(mod.props().products,products);assert.equal(mod.props().availableFilters,filters);assert.equal(mod.props().category,category);
 assert.equal(mod.props().title,'Disjoncteurs et interrupteurs différentiels');assert.equal((html.match(/<h1>/g)||[]).length,1);
 for(const p of products)assert.ok(html.includes(`/produit/${p.slug}`));
 for(const path of [parent.path,`${category.path}/hager`,`${category.path}/schneider`,'materiel-electrique/coffret-electrique'])assert.ok(html.includes(`/categorie/${path}`));
 assert.doesNotMatch(html,/\/legrand|livraison|en stock|certifié|AggregateRating|Offer|6 kA|IEC/);
 assert.ok(html.includes('interrupteurs différentiels, à distinguer des disjoncteurs'));
 const schema=JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
 assert.equal(schema['@type'],'BreadcrumbList');assert.deepEqual(schema.itemListElement.map(x=>[x.position,x.name]),[[1,'Accueil'],[2,parent.name],[3,category.name]]);
 assert.equal(schema.itemListElement[2].item,'https://www.goelec.ma/categorie/'+category.path);
});
test('removed reference/category records do not leave dead contextual links',async()=>{
 const mod=await load([],categories.filter(c=>[parent.id,category.id].includes(c.id)));
 const html=renderToStaticMarkup(await mod.default(params(category.path)));
 assert.doesNotMatch(html,/\/produit\/|\/hager|\/schneider|\/coffret-electrique|Quelques références/);
});
test('Disjoncteur changes preserve the approved Goulotte metadata',async()=>{
 const mod=await load(),meta=await mod.generateMetadata(params('gaines-conduits/goulotte'));
 assert.equal(meta.title,'Goulotte électrique perforée Ingelec au Maroc');
 assert.equal(meta.description,'Découvrez les goulottes électriques perforées Ingelec de 2 m chez GO ELEC au Maroc. Comparez les références pour le passage des câbles dans vos coffrets de commande.');
 assert.equal(meta.alternates.canonical,'https://www.goelec.ma/categorie/gaines-conduits/goulotte');
});
