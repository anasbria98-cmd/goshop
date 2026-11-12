import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const root={id:'cables',name:'Câbles & fils',slug:'cables-fils',path:'cables-fils',parentId:null,description:null};
const categories=[root,...[['cable-u500v','Câble U500V H07VU'],['cable-u500sv','Câble U500SV H07VK'],['cable-ro2v','Câble RO2V'],['cable-informatique','Câble informatique'],['cable-incendie','Câble incendie'],['cable-rvfv','Câble RVFV']].map(([slug,name])=>({id:slug,name,slug,path:`cables-fils/${slug}`,parentId:root.id,description:null}))];
const products=[{id:'metre',sku:'10097156',slug:'real-r2v-metre',variants:[{id:'existing-variant'}]},{id:'couronne',sku:'10027486',slug:'real-r2v-couronne'},{id:'fil',sku:'GS1006',slug:'real-fil'}];
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
test('broad cable metadata preserves canonical/indexability while RO2V retains its existing specific intent',async()=>{
 const mod=await load(),meta=await mod.generateMetadata(params(root.path));
 assert.equal(meta.title,'Câble électrique et fils au Maroc');
 assert.equal(meta.description,'Découvrez les câbles et fils électriques chez GO ELEC au Maroc : U-1000 R2V, H07V-U et références Nexans. Comparez les sections et conditionnements du catalogue.');
 assert.equal(meta.alternates.canonical,'https://www.goelec.ma/categorie/cables-fils');assert.equal(meta.robots,undefined);
 const ro2v=await mod.generateMetadata(params('cables-fils/cable-ro2v'));assert.equal(ro2v.title,'Câble RO2V');assert.equal(ro2v.alternates.canonical,'https://www.goelec.ma/categorie/cables-fils/cable-ro2v');
 const html=renderToStaticMarkup(await mod.default(params('cables-fils/cable-ro2v')));assert.equal(mod.props().title,undefined);assert.equal(mod.props().categoryContent,undefined);assert.doesNotMatch(html,/application\/ld\+json/);
});
test('cable content preserves catalogue/filter/variant inputs and links to verified families and references',async()=>{
 const mod=await load(),html=renderToStaticMarkup(await mod.default(params(root.path)));
 assert.equal(mod.props().products,products);assert.equal(mod.props().availableFilters,filters);assert.equal(mod.props().category,root);
 assert.equal(mod.props().title,'Câbles et fils électriques');assert.equal((html.match(/<h1>/g)||[]).length,1);
 for(const p of products)assert.ok(html.includes(`/produit/${p.slug}`));
 for(const c of categories.filter(c=>c.id!==root.id&&c.slug!=='cable-rvfv'))assert.ok(html.includes(`/categorie/${c.path}`));
 assert.doesNotMatch(html,/\/cable-rvfv|cuivre|XLPE|LSZH|IEC|certifié|résistant|enterré|livraison|AggregateRating|Offer/);
 const schema=JSON.parse(html.match(/<script[^>]*>(.*?)<\/script>/s)[1]);
 assert.equal(schema['@type'],'BreadcrumbList');assert.deepEqual(schema.itemListElement.map(x=>[x.position,x.name]),[[1,'Accueil'],[2,root.name]]);assert.equal(schema.itemListElement[1].item,'https://www.goelec.ma/categorie/cables-fils');
});
test('missing product and family records leave no dead hardcoded contextual links',async()=>{
 const mod=await load([], [root]);const html=renderToStaticMarkup(await mod.default(params(root.path)));
 assert.doesNotMatch(html,/\/produit\/|\/cable-ro2v|\/cable-informatique|FIRE ALARM|couronne de 50 m|fil H07V-U/);
});
test('previous SEO cluster titles remain unchanged',async()=>{
 const mod=await load();
 for(const [path,title] of [['gaines-conduits/goulotte','Goulotte électrique perforée Ingelec au Maroc'],['materiel-electrique/disjoncteur-interrupteur','Disjoncteur Hager et Schneider Electric au Maroc'],['appareillage','Appareillage électrique : prises et interrupteurs au Maroc']])assert.equal((await mod.generateMetadata(params(path))).title,title);
});
