import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {normalizeOrderComment,ORDER_COMMENT_MAX_LENGTH} from '../lib/order-comment.ts';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
async function compile(path,mocks={}){
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}),exports={};
 new Function('require','exports',outputText)(name=>name in mocks?mocks[name]:require(name),exports);return exports;
}
const shared={normalizeOrderComment,ORDER_COMMENT_MAX_LENGTH};
const productId='00000000-0000-4000-8000-000000000001',variantId='00000000-0000-4000-8000-000000000002';
function form(note){const f=new FormData();for(const [k,v] of Object.entries({email:'local@example.test',phone:'0600000000',first_name:'Amine',last_name:'Client',address_line_1:'12 rue Exemple',city:'Rabat',items:JSON.stringify([{product_id:productId,variant_id:variantId,quantity:2,price:0}]),user_id:'forged-user',grand_total:'0',shipping_total:'0'}))f.set(k,v);if(note!==undefined)f.set('customer_note',note);return f;}
async function action(user={id:'verified-customer'},rpcFailure=false){const calls=[],emails=[],events=[];const {placeOrder}=await compile('../app/checkout/actions.ts',{
 '@/lib/order-comment':shared,
 '@/lib/supabase/server':{createSupabaseServerClient:async()=>{events.push('auth');return {auth:{getUser:async()=>({data:{user}})}};}},
 '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});events.push('save');return rpcFailure?{data:null,error:{message:'Order rejected'}}:{data:{id:`saved-${calls.length}`,order_number:`GO-TEST-${calls.length}`},error:null};}})},
 '@/lib/send-order-confirmation':{sendOrderConfirmation:async id=>{emails.push(id);events.push('email');}},
 'next/navigation':{redirect:url=>{events.push('redirect');throw new Error('REDIRECT:'+url);}},
 });return {placeOrder,calls,emails,events};}
test('comment normalization preserves plain French/HTML-like text and internal line breaks, removes unsafe controls and maps blank to null',()=>{
 for(const blank of [undefined,'',' \n\t ','\u0000\u0001'])assert.equal(normalizeOrderComment(blank),null);
 assert.equal(normalizeOrderComment('  Sonnez au portail.\r\nÉtage 2.\rMerci\u0000\u0007  '),'Sonnez au portail.\nÉtage 2.\nMerci');
 const html='<script>alert("x")</script><img src=x onerror=alert(1)>';
 assert.equal(normalizeOrderComment(html),html,'plain-text storage must not execute or reinterpret markup');
});
test('checkout without a comment or with whitespace saves null while preserving the existing guest flow',async()=>{
 const a=await action(null);for(const note of [undefined,'','  \n\t ']){await assert.rejects(a.placeOrder(form(note)),/REDIRECT:/);const call=a.calls.at(-1);assert.equal(call.args.p_customer_note,null);assert.equal(call.args.p_user_id,null);assert.equal(call.name,'create_order_from_cart');}
});
test('each normalized comment is attached to its own saved order and only verified identity/quantities reach the pricing RPC',async()=>{
 const a=await action();for(const note of ['  Première commande\r\nPortail bleu  ','Deuxième commande'])await assert.rejects(a.placeOrder(form(note)),/REDIRECT:/);
 assert.deepEqual(a.calls.map(c=>c.args.p_customer_note),['Première commande\nPortail bleu','Deuxième commande']);
 for(const {args} of a.calls){assert.equal(args.p_user_id,'verified-customer');assert.deepEqual(args.p_items,[{product_id:productId,variant_id:variantId,quantity:2}]);assert.equal(args.p_shipping_address.city,'Rabat');assert.ok(!('grand_total' in args));assert.ok(!('shipping_total' in args));}
 assert.deepEqual(a.emails,['saved-1','saved-2']);assert.deepEqual(a.events,['auth','save','email','redirect','auth','save','email','redirect']);
});
test('exact maximum is accepted; oversized/file input and invalid existing checkout fields fail before any side effect',async()=>{
 const a=await action();await assert.rejects(a.placeOrder(form('a'.repeat(1000))),/REDIRECT:/);assert.equal(a.calls[0].args.p_customer_note.length,ORDER_COMMENT_MAX_LENGTH);
 for(const bad of ['a'.repeat(1001),new Blob(['not a comment'])]){const b=await action();await assert.rejects(b.placeOrder(form(bad)));assert.deepEqual(b.events,[]);assert.equal(b.calls.length,0);assert.equal(b.emails.length,0);}
 for(const field of ['email','phone','items']){const b=await action(),f=form('Valid note');f.set(field,field==='items'?'[]':'x');await assert.rejects(b.placeOrder(f));assert.deepEqual(b.events,[]);}
 const failed=await action(undefined,true);await assert.rejects(failed.placeOrder(form('Valid note')),/Order rejected/);assert.equal(failed.emails.length,0);
});
const Text=({children})=>children,Link=({href,children})=>React.createElement('a',{href},children);
const malicious='<script>alert(1)</script><img src=x onerror=alert(2)>';
const order={id:'order-a',order_number:'GO-TEST-A',user_id:'customer-a',customer_note:malicious,created_at:'2026-11-12T10:00:00Z',status:'pending',payment_status:'pending',fulfillment_status:'unfulfilled',currency:'MAD',grand_total:50,subtotal:50,discount_total:0,shipping_total:0,tax_total:0,email:'local@example.test',phone:'0600000000',shipping_address_snapshot:{},billing_address_snapshot:{}};
async function adminHtml(note){const row={...order,customer_note:note};const {default:Page}=await compile('../app/admin/orders/[id]/page.tsx',{
 'next/link':{default:Link},'next/navigation':{notFound(){throw new Error('Not found');}},
 '../../_components':{AdminHeader:({title,children})=>React.createElement('header',null,title,children),PanelHeader:({title})=>React.createElement('h2',null,title),EmptyState:Text,Status:Text,SubmitButton:({children})=>React.createElement('button',null,children)},
 '../../actions':{updateOrderStatus:'/test-update'},'@/lib/catalog-model':{money:n=>`${n} DH`},
 '@/lib/supabase/server':{createSupabaseServerClient:async()=>({from:table=>{const b={select(){return b;},eq(key,value){if(table==='orders')assert.equal(value,row.id);return b;},single:async()=>({data:row}),order:async()=>({data:[]}),then:resolve=>resolve({data:[]})};return b;}})},
 });return renderToStaticMarkup(await Page({params:Promise.resolve({id:row.id})}));}
test('admin renders comments as escaped text and hides the row for historical empty/null notes',async()=>{
 const html=await adminHtml(malicious);assert.ok(html.includes('Commentaire du client'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('white-space:pre-wrap'));assert.ok(!html.includes('<script>alert'));assert.ok(!html.includes('<img src="x"'));
 for(const blank of [null,'','  \n '])assert.ok(!(await adminHtml(blank)).includes('Commentaire du client'));
});
async function customerHtml(userId,notes=[order,{...order,id:'order-b',order_number:'GO-TEST-B',user_id:'customer-b',customer_note:'PRIVATE-B'}]){
 const queries=[];const {default:Page}=await compile('../app/compte/page.tsx',{
 'next/link':{default:Link},'@/components/storefront-language':{StoreText:Text},'@/app/auth/actions':{signOut:'/test-sign-out'},'next/navigation':{redirect(){throw new Error('Admin redirect');}},
 '@/lib/auth':{requireUser:async()=>({id:userId,email:userId+'@example.test'})},'@/lib/auth-routing':{isAdminRole:r=>r==='admin'},'./password-form':{CustomerPasswordForm:()=>null},'./account.module.css':{default:{orderComment:'order-comment'}},
 '@/lib/supabase/server':{createSupabaseServerClient:async()=>({from:table=>{let filter;const b={select(columns){if(table==='orders')assert.ok(columns.includes('customer_note'));return b;},eq(key,value){filter={key,value};queries.push({table,key,value});return b;},single:async()=>({data:{id:userId,role:'customer',first_name:userId}}),order(){return b;},range(){assert.deepEqual(filter,{key:'user_id',value:userId});return Promise.resolve({data:notes.filter(o=>o.user_id===filter.value),count:1,error:null});},then:resolve=>resolve({data:[],error:null})};return b;}})},
 });return {html:renderToStaticMarkup(await Page({searchParams:Promise.resolve({})})),queries};
}
test('customer comments use the existing own-user query, remain escaped and never expose another customer order',async()=>{
 const a=await customerHtml('customer-a'),b=await customerHtml('customer-b');assert.ok(a.html.includes('GO-TEST-A'));assert.ok(!a.html.includes('GO-TEST-B'));assert.ok(!a.html.includes('PRIVATE-B'));assert.ok(a.html.includes('&lt;script&gt;'));assert.ok(!a.html.includes('<script>alert'));
 assert.ok(b.html.includes('PRIVATE-B'));assert.ok(!b.html.includes('GO-TEST-A'));assert.ok(!b.html.includes('&lt;script&gt;'));
 const old=await customerHtml('customer-a',[{...order,customer_note:null}]);assert.ok(!old.html.includes('Commentaire sur la commande'));assert.ok(old.html.includes('GO-TEST-A'));
});
test('checkout has one optional accessible bounded textarea with the required French text and unchanged variant payload',async()=>{
 const {CheckoutForm}=await compile('../app/checkout/checkout-form.tsx',{'@/components/storefront-language':{StoreText:Text},'@/components/store-provider':{useStore:()=>({cart:{line:{product:{id:productId,name:'Local product',price:25,selectedVariant:{id:variantId,name:'Local variant'}},quantity:2}},total:50})},'@/lib/catalog-model':{money:n=>`${n} DH`},'@/lib/product-variants':{cartLineKey:p=>p.id},'@/lib/order-comment':shared,'./actions':{placeOrder:'/test-checkout'}});
 const html=renderToStaticMarkup(React.createElement(CheckoutForm)),{load}=require('cheerio'),$=load(html),field=$('textarea[name="customer_note"]');
 assert.equal(field.length,1);assert.equal(field.attr('maxlength'),'1000');assert.equal(field.attr('required'),undefined);assert.equal(field.attr('placeholder'),'Ajoutez une information ou une remarque concernant votre commande (facultatif)');assert.equal($('label[for="order-comment"] > :first-child').text()||$('label[for="order-comment"]').text().split('1 000')[0],'Commentaire sur la commande');
 assert.equal(field.attr('aria-describedby'),'order-comment-limit');assert.deepEqual(JSON.parse($('input[name="items"]').attr('value')),[{product_id:productId,variant_id:variantId,quantity:2}]);
});
