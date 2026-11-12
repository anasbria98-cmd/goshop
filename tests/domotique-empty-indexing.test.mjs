import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const root={id:'domotique',path:'domotique',name:'Domotique',parentId:null,description:null};
const domotique=[root,...['prises-connectees','commandes-connectees','thermostats','passerelles','volets-roulants'].map(slug=>({id:slug,path:`domotique/${slug}`,name:slug,parentId:root.id,description:null}))];
const others=[{id:'security',path:'securite',name:'Sécurité',parentId:null},{id:'empty-public',path:'eclairage/vide',name:'Unrelated empty category',parentId:'eclairage'},{id:'similar',path:'domotique-autre',name:'Different category',parentId:null}];
const categories=[...domotique,...others],params=path=>({params:Promise.resolve({slug:path.split('/')})});
async function compile(path,mocks={}){
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}),exports={};
 new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);return exports;
}
async function load(products=[],cats=categories,{failure=false}={}){
 const requests=[];
 const catalog={getCategories:async()=>cats,getProducts:async(query,known)=>{
  requests.push(query);
  if(failure)throw new Error('Catalogue unavailable');
  if(!query)return products;
  assert.equal(known,cats);assert.deepEqual(Object.keys(query),['categoryPath']);
  const path=query.categoryPath.join('/'),ids=new Set(cats.filter(c=>c.path===path||c.path.startsWith(path+'/')).map(c=>c.id));
  return products.filter(p=>p.categoryIds.some(id=>ids.has(id)));
 }};
 const page=await compile('../app/categorie/[...slug]/page.tsx',{'@/lib/catalog':catalog,'@/components/catalog-view':{CatalogView:()=>null},'next/navigation':{notFound(){throw new Error('NOT_FOUND');}},'next/link':{default:()=>null}});
 const map=await compile('../app/sitemap.ts',{'@/lib/catalog':catalog,'@/data/information':{information:{contact:{}}}});
 return {page,sitemap:map.default,requests};
}
const categoryUrl=c=>'https://www.goelec.ma/categorie/'+c.path;
test('all six empty Domotique pages receive noindex,follow without canonical or content metadata changes',async()=>{
 const {page}=await load();
 for(const c of domotique){const meta=await page.generateMetadata(params(c.path));assert.deepEqual(meta.robots,{index:false,follow:true});assert.equal(meta.alternates.canonical,categoryUrl(c));}
 const meta=await page.generateMetadata(params(root.path));assert.equal(meta.title,'Domotique au Maroc');assert.equal(meta.description,'Découvrez nos solutions de domotique pour piloter, automatiser et moderniser vos installations au Maroc avec GO ELEC.');
});
test('sitemap removes exactly the six empty Domotique categories, retaining unrelated empty categories and all product/information URLs',async()=>{
 const product={slug:'real-smart-lock',categoryIds:['security']};const {sitemap}=await load([product]);
 assert.deepEqual((await sitemap()).map(x=>x.url),['https://www.goelec.ma/',...others.map(categoryUrl),'https://www.goelec.ma/produit/real-smart-lock','https://www.goelec.ma/informations/contact']);
});
test('publishing an out-of-stock product in a nested branch restores its category and ancestors consistently; empty siblings stay noindex and excluded',async()=>{
 const nested={id:'future',path:'domotique/prises-connectees/future',name:'Future real category',parentId:'prises-connectees'};
 const {page,sitemap}=await load([{slug:'new-published-product',categoryIds:[nested.id],stock:0}],[...categories,nested]);
 const included=new Set((await sitemap()).map(x=>x.url));
 for(const c of [...domotique,nested]){const populated=[root.id,'prises-connectees',nested.id].includes(c.id);const meta=await page.generateMetadata(params(c.path));assert.equal(meta.robots?.index,populated?undefined:false);assert.equal(included.has(categoryUrl(c)),populated);}
});
test('direct and secondary category assignments are respected without promoting empty child branches',async()=>{
 const {page,sitemap}=await load([{slug:'published-product',categoryIds:['security',root.id],stock:0}]);
 const urls=new Set((await sitemap()).map(x=>x.url));
 for(const c of domotique){const meta=await page.generateMetadata(params(c.path));assert.equal(meta.robots?.index,c.id===root.id?undefined:false);assert.equal(urls.has(categoryUrl(c)),c.id===root.id);}
});
test('unrelated and nonexistent categories do not trigger added product queries; catalogue errors are never converted into empty results',async()=>{
 const {page,requests}=await load();
 for(const path of [...others.map(c=>c.path),'domotique/nonexistent'])assert.equal((await page.generateMetadata(params(path))).robots,undefined);
 assert.equal(requests.length,0);
 const failed=await load([],categories,{failure:true});await assert.rejects(failed.page.generateMetadata(params(root.path)),/Catalogue unavailable/);await assert.rejects(failed.sitemap(),/Catalogue unavailable/);
});
test('robots remains crawlable for every Domotique page and retains existing private restrictions',async()=>{
 const {default:robots}=await compile('../app/robots.ts'),data=robots();
 for(const c of domotique)assert.ok(!data.rules.disallow.some(rule=>`/categorie/${c.path}`.startsWith(rule)));
 assert.deepEqual(data.rules.disallow,['/admin','/api','/auth','/compte']);
 assert.equal(data.sitemap,'https://www.goelec.ma/sitemap.xml');
});
