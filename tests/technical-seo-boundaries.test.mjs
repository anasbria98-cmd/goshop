import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const {NextRequest}=require('next/server');
const {unstable_doesMiddlewareMatch:unstable_doesProxyMatch}=require('next/experimental/testing/server');
async function compile(path,mocks={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 const exports={};new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);return exports;
}
async function loadProxy() {
 let checks=0;
 const mod=await compile('../proxy.ts',{
  '@supabase/ssr':{createServerClient:(_url,_key,{cookies})=>({auth:{getClaims:async()=>{checks++;cookies.setAll([{name:'test-session',value:'refreshed',options:{httpOnly:true}}]);}}})},
  './lib/product-social-model':require('../lib/product-social-model.ts'),
 });return {...mod,checks:()=>checks};
}
test('apex redirect strips container ports and preserves the exact path/query, including encoded values',async()=>{
 const {proxy,checks}=await loadProxy();
 for(const protocol of ['http:','https:'])for(const path of ['/','/produit/barrette-de-terre?x=1&x=2&next=%2Fcompte','/categorie/%C3%A9clairage?q=a%20b','/branding/logo.png?v=2','//external.example/path']){
  const request=new NextRequest(`${protocol}//internal:3000${path}`,{headers:{host:'internal:3000','x-forwarded-host':'goelec.ma:443, internal:3000'}});
  const response=await proxy(request),target=new URL(response.headers.get('location'));
  assert.equal(response.status,308);assert.equal(target.origin,'https://www.goelec.ma');assert.equal(target.port,'');
  assert.equal(target.pathname,request.nextUrl.pathname);assert.equal(target.search,request.nextUrl.search);
 }
 assert.equal(checks(),0,'redirect does not run Auth or catalogue queries');
});
test('matcher canonicalizes apex assets but leaves www static asset handling unchanged',async()=>{
 const {config}=await loadProxy();
 for(const path of ['/branding/logo.png','/favicon.ico','/_next/static/chunk.js','/produit/barrette-de-terre/partage.jpg']){
  assert.equal(unstable_doesProxyMatch({config,nextConfig:{},url:'https://goelec.ma'+path,headers:{host:'goelec.ma'}}),true);
  assert.equal(unstable_doesProxyMatch({config,nextConfig:{},url:'http://internal:3000'+path,headers:{host:'internal:3000','x-forwarded-host':'goelec.ma'}}),true);
  assert.equal(unstable_doesProxyMatch({config,nextConfig:{},url:'https://www.goelec.ma'+path,headers:{host:'www.goelec.ma'}}),false);
 }
});
test('private noindex headers preserve Auth refresh and cookies; public pages and social rewrites stay unchanged',async()=>{
 const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='unit-test';
 try{
  const {proxy,checks}=await loadProxy();
  const paths=['/admin','/admin/products/new','/compte','/compte/adresses','/auth/sign-in','/auth/sign-up','/checkout','/commande-confirmee'];
  for(const path of paths){const r=await proxy(new NextRequest('https://www.goelec.ma'+path,{headers:{host:'www.goelec.ma'}}));assert.equal(r.headers.get('x-robots-tag'),'noindex, follow');assert.match(r.headers.get('set-cookie'),/test-session=refreshed/);assert.equal(r.headers.get('location'),null);}
  assert.equal(checks(),paths.length);
  for(const path of ['/','/categorie/eclairage','/produit/barrette-de-terre','/demander-un-devis']){const r=await proxy(new NextRequest('https://www.goelec.ma'+path));assert.equal(r.headers.get('x-robots-tag'),null);assert.equal(r.headers.get('location'),null);}
  const social=await proxy(new NextRequest('https://www.goelec.ma/produit/barrette-de-terre',{headers:{'user-agent':'WhatsApp/2.24'}}));assert.equal(social.headers.get('x-middleware-rewrite'),'https://www.goelec.ma/api/product-social/barrette-de-terre');assert.equal(social.headers.get('x-robots-tag'),null);
 }finally{if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=oldKey;}
});
test('robots lets crawlers read public noindex pages while restricting private roots and descendants',async()=>{
 const {default:robots}=await compile('../app/robots.ts');const data=robots();
 for(const path of ['/recherche','/recherche?q=hager&promo=1','/recherche?marque=hager','/panier','/favoris','/checkout','/commande-confirmee','/categorie/eclairage','/produit/barrette-de-terre'])assert.ok(!data.rules.disallow.some(rule=>path.startsWith(rule)),path);
 for(const path of ['/admin','/admin/products','/compte','/compte/adresses','/auth/sign-in','/api/quote-requests'])assert.ok(data.rules.disallow.some(rule=>path.startsWith(rule)),path);
 assert.equal(data.sitemap,'https://www.goelec.ma/sitemap.xml');
});
test('sitemap excludes only the protected quote page and preserves public catalogue and information URLs',async()=>{
 const {default:sitemap}=await compile('../app/sitemap.ts',{
  '@/lib/catalog':{getCategories:async()=>[{path:'eclairage/interieur',parentId:'root'}],getProducts:async()=>[{slug:'barrette-de-terre'}]},
  '@/data/information':{information:{contact:{}}},
 });assert.deepEqual((await sitemap()).map(x=>x.url),['https://www.goelec.ma/','https://www.goelec.ma/categorie/eclairage/interieur','https://www.goelec.ma/produit/barrette-de-terre','https://www.goelec.ma/informations/contact']);
});
