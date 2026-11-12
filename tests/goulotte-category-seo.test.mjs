import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const parent={id:'parent',name:'Gaines et conduits',path:'gaines-conduits',parentId:null,description:null};
const category={id:'goulotte',name:'Goulotte',path:'gaines-conduits/goulotte',parentId:'parent',description:null};
const products=['G6060','G6040','G4060','G4040','G2540'].map(sku=>({id:sku,sku,name:`GOULOTTE PERFORE 2M ${sku}`,slug:`goulotte-perfore-2m-${sku.toLowerCase()}`}));
const filters=[{id:'existing-filter'}];
async function load(list=products){
 let props;
 const source=await readFile(new URL('../app/categorie/[...slug]/page.tsx',import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 const exports={};
 const mocks={
  'next/navigation':{notFound(){throw new Error('NOT_FOUND');}},
  'next/link':{default:({href,children,...rest})=>React.createElement('a',{href,...rest},children)},
  '@/components/catalog-view':{CatalogView:p=>{props=p;return React.createElement('main',null,React.createElement('h1',null,p.title||p.category.name),p.categoryContent);}},
  '@/lib/catalog':{getCategories:async()=>[parent,category],getProducts:async()=>list,getCategoryFilters:async()=>filters},
 };
 new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);
 return {...exports,props:()=>props};
}
const params=path=>({params:Promise.resolve({slug:path.split('/')})});
test('Goulotte metadata keeps its established canonical and has a catalogue-grounded title/description',async()=>{
 const mod=await load(),meta=await mod.generateMetadata(params(category.path));
 assert.equal(meta.title,'Goulotte électrique perforée Ingelec au Maroc');
 assert.match(meta.description,/Ingelec de 2 m/);
 assert.equal(meta.alternates.canonical,'https://www.goelec.ma/categorie/gaines-conduits/goulotte');
 assert.equal(meta.robots,undefined);
});
test('target content links to the real loaded products and parent; schema matches the visible hierarchy',async()=>{
 const mod=await load(),html=renderToStaticMarkup(await mod.default(params(category.path)));
 assert.equal(mod.props().title,'Goulotte électrique');
 assert.equal(mod.props().products,products);assert.equal(mod.props().availableFilters,filters);
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 for(const product of products)assert.ok(html.includes(`/produit/${product.slug}`));
 assert.ok(html.includes('/categorie/gaines-conduits'));
 const schema=JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
 assert.equal(schema['@type'],'BreadcrumbList');
 assert.deepEqual(schema.itemListElement.map(x=>[x.position,x.name]),[[1,'Accueil'],[2,'Gaines et conduits'],[3,'Goulotte']]);
 assert.doesNotMatch(html,/60\s?[x×]\s?60|PVC|livraison gratuite|AggregateRating/);
});
test('other categories retain their existing metadata, heading, listing and no extra content/schema',async()=>{
 const mod=await load(),meta=await mod.generateMetadata(params(parent.path));
 assert.equal(meta.title,'Gaines et conduits');
 const html=renderToStaticMarkup(await mod.default(params(parent.path)));
 assert.equal(mod.props().title,undefined);assert.equal(mod.props().categoryContent,undefined);
 assert.equal(mod.props().products,products);assert.equal(mod.props().availableFilters,filters);
 assert.doesNotMatch(html,/application\/ld\+json|goulottes électriques perforées/);
 await assert.rejects(mod.default(params('missing-category')),/NOT_FOUND/);
});
test('product reference links reflect future catalogue changes rather than hardcoded slugs',async()=>{
 const next={id:'new',sku:'NEW-REF',name:'New real product',slug:'new-real-product'};
 const mod=await load([next]),html=renderToStaticMarkup(await mod.default(params(category.path)));
 assert.ok(html.includes('/produit/new-real-product'));assert.ok(html.includes('NEW-REF'));
 assert.doesNotMatch(html,/goulotte-perfore-2m-g6060/);
});
