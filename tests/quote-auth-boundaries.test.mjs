import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const {NextRequest}=require('next/server');
async function compile(path,mocks){
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 const exports={};new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);return exports;
}
const data={request_id:'00000000-0000-4000-8000-000000000001',first_name:'Amina',last_name:'El Amrani',phone:'0612345678',email:'customer@example.test',category_id:'general',subject:'Projet électrique',message:'Matériel pour un nouveau projet.'};
function request(values=data){const form=new FormData();for(const [key,value]of Object.entries(values))form.set(key,value);return new NextRequest('http://localhost/api/quote-requests',{method:'POST',headers:{origin:'http://localhost'},body:form});}
async function endpoint(user){const events=[],hashes=[];const route=await compile('../app/api/quote-requests/route.ts',{
 '@/lib/auth':{getCurrentUser:async()=>{events.push('verify-user');if(user instanceof Error)throw user;return user;}},
 '@/lib/supabase/admin':{createSupabaseAdminClient:()=>{events.push('admin-client');return{rpc:async(_name,args)=>{hashes.push(args.p_hash);events.push('claim');return{data:'saved',error:null}}};}},
 '@/lib/env':{getSecretSupabaseKey:()=> 'test-only-key'},
 '@/lib/quote-request':require('../lib/quote-request.ts'),
 '@/lib/quote-processing':require('../lib/quote-processing.ts'),
 '@/lib/quote-delivery':{notifyQuoteRequest:async()=>assert.fail('must not send an email in auth tests')},
 });return{...route,events,hashes};}
test('unauthenticated or expired sessions cannot parse, upload, claim or submit a quote, even with forged form identity',async()=>{
 const api=await endpoint(null);const response=await api.POST(request({...data,user_id:'forged-user'}));
 assert.equal(response.status,401);assert.match((await response.json()).error,/Connectez-vous/);assert.deepEqual(api.events,['verify-user']);
 const malformed=new NextRequest('http://localhost/api/quote-requests',{method:'POST',headers:{origin:'http://localhost','content-type':'text/plain'},body:'not a quote'});
 assert.equal((await api.POST(malformed)).status,401);assert.ok(!api.events.includes('admin-client'));
});
test('Auth outages fail closed before service-role processing; authenticated requests keep existing validation and save behavior',async()=>{
 const outage=await endpoint(new Error('offline'));assert.equal((await outage.POST(request())).status,503);assert.deepEqual(outage.events,['verify-user']);
 const api=await endpoint({id:'customer-a'});assert.equal((await api.POST(request({...data,subject:''}))).status,400);assert.deepEqual(api.events,['verify-user']);
 assert.equal((await api.POST(request())).status,200);assert.deepEqual(api.events,['verify-user','verify-user','admin-client','claim']);
 const other=await endpoint({id:'customer-b'});assert.equal((await other.POST(request())).status,200);assert.notEqual(api.hashes[0],other.hashes[0],'idempotency is bound to the verified user, not supplied form identity');
});
test('all desktop/mobile quote links are always available without an Auth lookup',async()=>{
 const empty=()=>null,Text=({children})=>children,Link=({href,children})=>React.createElement('a',{href},children);
 for(const allowed of [false,true]){
  const {Header}=await compile('../components/header.tsx',{
   '@/components/storefront-language':{StoreText:Text,LanguageSwitcher:empty,useStorefrontLanguage:()=>({t:v=>v})},
   'next/link':{default:Link},'./utility-items.module.css':{default:{}},'./quote-entry.module.css':{default:{}},
   './utility-return-icon':{UtilityReturnIcon:empty},
   '@/lib/catalog-model':{money:()=> '0 DH'},'@/lib/category-navigation':{categoryMenuColumns:()=>[]},
   './store-provider':{useStore:()=>({count:0,total:0,favorites:[]})},'./brand-logo':{BrandLogo:empty},
   './navigation-feedback':{NavigationFeedback:empty},'./mobile-category-menu':{MobileCategoryMenu:empty},
   './use-quote-access':{useQuoteAccess:()=>allowed},
  });
  const html=renderToStaticMarkup(React.createElement(Header,{navigation:{all:[],top:[],mobile:[]}}));
  assert.equal((html.match(/href="\/demander-un-devis"/g)||[]).length,3);
  assert.equal((html.match(/https:\/\/wa.me\/212644605258/g)||[]).length,2,'technician actions remain unchanged');
 }
});

test('anonymous quote page access redirects to signup before fetching categories or rendering the form',async()=>{
 const events=[],redirect=new Error('existing sign-in redirect');
 const {default:Page}=await compile('../app/demander-un-devis/page.tsx',{
  '@/lib/auth':{getCurrentUser:async()=>null},
  'next/navigation':{redirect:path=>{events.push(path);throw redirect;}},
  '@/lib/catalog':{getCategories:async()=>assert.fail('anonymous visitor must not load the protected form')},
  './quote-request-form':{QuoteRequestForm:()=>null},'./quote-request.module.css':{default:{}},'next/link':{default:()=>null},
 });
 await assert.rejects(Page(),redirect);assert.deepEqual(events,['/auth/sign-up?next=%2Fdemander-un-devis']);
});
