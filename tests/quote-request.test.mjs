import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteRequestSchema,normalizeMoroccanPhone,quoteFileError,quoteFileMatchesContent} from '../lib/quote-request.ts';
import {processQuoteRequest} from '../lib/quote-processing.ts';
import {notifyQuoteRequest} from '../lib/quote-delivery.ts';
const input={first_name:' Amina ',last_name:'El Amrani',phone:'06 12 34 56 78',email:'amina@example.test',category_id:'general',subject:'Installation électrique',message:'Besoin de matériel pour un projet.'};
test('quote fields validate and normalize Moroccan domestic/international phones',()=>{
 assert.equal(quoteRequestSchema.parse(input).first_name,'Amina');
 for(const v of ['0612345678','+212 612345678','00212 612345678']) assert.equal(normalizeMoroccanPhone(v),'+212612345678');
 for(const v of ['+33123456789','+212123456789','06123','+2120612345678']) assert.equal(quoteRequestSchema.safeParse({...input,phone:v}).success,false);
 for(const field of ['first_name','last_name','subject','message','email','category_id']) assert.equal(quoteRequestSchema.safeParse({...input,[field]:''}).success,false);
 assert.equal(quoteRequestSchema.safeParse({...input,email:'bad@'}).success,false);
 assert.equal(quoteRequestSchema.safeParse({...input,subject:'x'.repeat(161)}).success,false);
});
test('quote attachments reject oversized, too many, executable and disguised files',()=>{
 const pdf={name:'plan.pdf',type:'application/pdf',size:32};
 assert.equal(quoteFileError([pdf]),null);
 assert.ok(quoteFileError([pdf,pdf,pdf,pdf]));
 assert.ok(quoteFileError([{...pdf,size:6*1024*1024}]));
 assert.ok(quoteFileError(Array(3).fill({...pdf,size:4*1024*1024})));
 assert.ok(quoteFileError([{...pdf,name:'plan.exe'}]));
 assert.ok(quoteFileError([{...pdf,name:'plan.jpg'}]));
 assert.equal(quoteFileMatchesContent('application/pdf',new TextEncoder().encode('%PDF-1.7')),true);
 assert.equal(quoteFileMatchesContent('application/pdf',new TextEncoder().encode('<script>')),false);
 assert.equal(quoteFileMatchesContent('image/png',new Uint8Array([137,80,78,71,13,10,26,10])),true);
});
const id='00000000-0000-4000-8000-000000000001';
const file={name:'plan.pdf',type:'application/pdf',bytes:new TextEncoder().encode('%PDF-1.7'),path:`${id}/plan.pdf`};
function deps(overrides={}){const events=[];return {events,id,files:[file],claim:async()=>{events.push('claim');return 'claimed'},upload:async()=>events.push('upload'),complete:async()=>events.push('save'),fail:async()=>events.push('fail'),notify:async()=>events.push('notify'),...overrides};}
test('quote upload and save finish before notification; email failure cannot fail saved quote',async()=>{
 const d=deps();assert.equal((await processQuoteRequest(d)).ok,true);assert.deepEqual(d.events,['claim','upload','save','notify']);
 assert.equal((await processQuoteRequest(deps({notify:async()=>{throw Error('provider')}}))).ok,true);
});
test('duplicate, concurrent, mismatched and rate-limited requests never upload or notify again',async()=>{
 for(const state of ['saved','busy','mismatch','limited']){const d=deps({claim:async()=>state});const result=await processQuoteRequest(d);assert.equal(result.ok,state==='saved');assert.deepEqual(d.events,[]);}
});
test('upload/save failure is explicit and retryable, and never produces a false success email',async()=>{
 for(const step of ['upload','complete']){const d=deps({[step]:async()=>{throw Error('failure')}});assert.equal((await processQuoteRequest(d)).state,'failed');assert.ok(d.events.includes('fail'));assert.ok(!d.events.includes('notify'));}
});
test('quote notification uses the approved sender, escaped customer data and idempotency',async()=>{
 let sent;const logs=[];
 await notifyQuoteRequest({key:'local-fake-test-key',id,reference:'DEV-LOCAL',input:{...input,message:'<script>alert(1)</script>'},category:'Éclairage',files:['plan.pdf'],log:c=>logs.push(c),request:async(url,init)=>{sent={url,...init};return new Response('{}',{status:200});}});
 const body=JSON.parse(sent.body);assert.equal(body.from,'GO ELEC <noreply@goelec.ma>');assert.deepEqual(body.to,['contact@goelec.ma']);assert.equal(body.reply_to,input.email);assert.ok(body.html.includes('&lt;script&gt;'));assert.ok(!body.html.includes('<script>'));assert.equal(sent.headers['Idempotency-Key'],`quote-request/${id}`);assert.deepEqual(logs,[]);
 await notifyQuoteRequest({id,reference:'DEV-LOCAL',input,category:'Générale',files:[],log:c=>logs.push(c),request:async()=>{throw Error('must not send')}});assert.deepEqual(logs,['missing_api_key']);
});
