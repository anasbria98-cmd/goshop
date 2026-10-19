import test from 'node:test';
import assert from 'node:assert/strict';
import {orderConfirmation,deliverOrderConfirmation} from '../lib/order-confirmation.ts';
const order={id:'saved-order',order_number:'GO-2026-123456',created_at:'2026-10-19T10:00:00Z',email:'customer@example.test',phone:'0600000000',currency:'MAD',grand_total:250,shipping_address_snapshot:{first_name:'Amine',last_name:'Client',address_line_1:'12 rue Exemple',city:'Rabat',country:'MA'}};
const items=[{product_name:'Prise <script>alert(1)</script>',variant_name:'Marron',quantity:2,unit_price:125,line_total:250}];
const load=async()=>({order,items});
test('French branded confirmation uses saved snapshots, variants, totals, address, phone and escaped customer content',()=>{
 const message=orderConfirmation(order,items);
 assert.match(message.subject,/GO ELEC – Confirmation de votre commande GO-2026-123456/);
 for(const value of ['Merci pour votre commande','Amine Client','Rabat','0600000000','Marron','GO-2026-123456','250']) assert.ok(message.html.includes(value),value);
 assert.ok(!message.html.includes('<script>'));
 assert.match(message.html,/&lt;script&gt;/);
 assert.match(message.html,/https:\/\/www.goelec.ma\/branding\/goelec_electrical_security_logo.png/);
 assert.ok(!message.html.toLowerCase().includes('supabase'));
 assert.match(message.text,/Quantité : 2/);
 assert.match(message.text,/Prix unitaire : 125/);
 const minimal=orderConfirmation({...order,phone:null,shipping_address_snapshot:null},items);
 assert.ok(!minimal.html.includes('Adresse de livraison'));
 assert.ok(!minimal.html.includes('Téléphone :'));
});
test('Resend request uses the saved recipient, fixed sender and per-order idempotency without creating orders',async()=>{
 const logs=[];let calls=0;
 await deliverOrderConfirmation({key:'local-test-placeholder',load,log:c=>logs.push(c),request:async(url,options)=>{
  calls++;assert.equal(url,'https://api.resend.com/emails');
  assert.equal(options.headers['Idempotency-Key'],'order-confirmation/saved-order');
  const body=JSON.parse(options.body);assert.equal(body.from,'GO ELEC <noreply@goelec.ma>');assert.equal(body.reply_to,'contact@goelec.ma');assert.deepEqual(body.to,[order.email]);assert.ok(body.text);assert.ok(options.signal);
  return new Response('{}',{status:200});
 }});
 assert.equal(calls,1);assert.deepEqual(logs,[]);
});
test('Missing key, snapshot failures, provider failures and network failures never reject or log sensitive data',async()=>{
 for(const scenario of ['missing','load','provider','network','empty']) {
  const logs=[];let requested=false;
  await assert.doesNotReject(()=>deliverOrderConfirmation({key:scenario==='missing'?undefined:'local-test-placeholder',log:c=>logs.push(c),load:async()=>{if(scenario==='load')throw new Error('PRIVATE database payload');return {order,items:scenario==='empty'?[]:items};},request:async()=>{requested=true;if(scenario==='network')throw new Error('PRIVATE token');return new Response('PRIVATE provider payload',{status:403});}}));
  assert.equal(logs.length,1);assert.ok(!JSON.stringify(logs).includes('PRIVATE'));assert.ok(!JSON.stringify(logs).includes(order.email));
  if(['missing','load','empty'].includes(scenario))assert.equal(requested,false);
 }
});
