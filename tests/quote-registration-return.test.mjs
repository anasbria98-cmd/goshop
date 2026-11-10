import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
async function compile(path,mocks){
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 const exports={};new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);return exports;
}
const next='/demander-un-devis';
test('existing signup and login pages preserve quote destination when switching forms',async()=>{
 for(const kind of ['sign-up','sign-in']){
  const {default:Page}=await compile(`../app/auth/${kind}/page.tsx`,{
   '@/components/storefront-language':{StoreText:({children})=>children},
   'next/link':{default:({href,children})=>React.createElement('a',{href},children)},
   '@/app/auth/actions':{signUp:()=>{},signIn:()=>{}},
   '@/components/auth-submit-button':{AuthSubmitButton:()=>null},
  });
  const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({next})}));
  assert.match(html,/name="next" value="\/demander-un-devis"/);
  assert.ok(html.includes(`href="/auth/${kind==='sign-up'?'sign-in':'sign-up'}?next=%2Fdemander-un-devis"`));
 }
});
test('signup preserves quote return through confirmation, validation errors and immediate sessions',async()=>{
 for(const mode of ['confirmation','session','error','invalid']){
  let options;
  const {signUp}=await compile('../app/auth/actions.ts',{
   'next/headers':{headers:async()=>new Headers({origin:'https://www.goelec.ma'})},
   'next/navigation':{redirect:path=>{throw Error(path)}},
   '@/lib/auth-routing':require('../lib/auth-routing.ts'),
   '@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{signUp:async input=>{options=input;return{data:{session:mode==='session'?{}:null},error:mode==='error'?{message:'Signup failed'}:null}}}})},
  });
  const form=new FormData();for(const [k,v]of Object.entries({first_name:'Amina',last_name:'Amrani',email:'customer@example.test',password:mode==='invalid'?'x':'not-a-real-password',next}))form.set(k,v);
  await assert.rejects(signUp(form),err=>{
   if(mode==='session')assert.equal(err.message,next);
   else assert.ok(err.message.includes('next=%2Fdemander-un-devis'));
   return true;
  });
  if(options)assert.equal(options.options.emailRedirectTo,'https://www.goelec.ma/auth/callback?next=%2Fdemander-un-devis');
 }
});
test('existing login action returns an authenticated customer to the quote page',async()=>{
 const {signIn}=await compile('../app/auth/actions.ts',{
  'next/headers':{},'next/navigation':{redirect:path=>{throw Error(path)}},
  '@/lib/auth-routing':require('../lib/auth-routing.ts'),
  '@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{signInWithPassword:async()=>({data:{user:{id:'customer'}},error:null})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:'customer'}})})})})})},
 });
 const form=new FormData();form.set('email','customer@example.test');form.set('password','not-a-real-password');form.set('next',next);
 await assert.rejects(signIn(form),err=>err.message===next);
});
