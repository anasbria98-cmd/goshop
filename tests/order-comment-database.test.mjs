import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {normalizeOrderComment} from '../lib/order-comment.ts';

test('existing checkout RPC persists order comments and existing RLS isolates customers without a migration', {skip:!process.env.GOELEC_TEST_PGLITE_PATH&&'Set GOELEC_TEST_PGLITE_PATH for isolated PostgreSQL'},async t=>{
 const {PGlite}=await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href),db=new PGlite(),q=async(sql,values=[])=>(await db.query(sql,values)).rows;
 const users={a:'00000000-0000-4000-8000-000000000091',b:'00000000-0000-4000-8000-000000000092',admin:'00000000-0000-4000-8000-000000000093'};
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',current_user)$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;`);
  for(const name of ['202610090001_initial_commerce.sql','202610090002_secure_checkout.sql','202610090003_order_workflow.sql','202610140001_appareillage_color_variants.sql','202610270003_general_variant_flow.sql','202610310001_all_category_variant_images.sql'])await db.exec((await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  await db.exec(`grant usage on schema public,auth,storage to anon,authenticated,service_role;grant all on all tables in schema public to authenticated,service_role;grant select on all tables in schema public to anon;grant usage,select on all sequences in schema public to authenticated,service_role;`);
  for(const id of Object.values(users))await q('insert into auth.users(id) values($1)',[id]);
  await q("update profiles set role='super_admin' where id=$1",[users.admin]);
  const [simple]=await q("insert into products(name,slug,sku,price,status,published_at) values('Local simple','local-simple','LOCAL-SIMPLE',75.25,'active',now()) returning id");
  const [variantProduct]=await q("insert into products(name,slug,sku,price,status,published_at) values('Local variant','local-variant','LOCAL-BASE',50,'active',now()) returning id");
  const [variant]=await q("insert into product_variants(product_id,name,sku,price,is_active) values($1,'Local choice','LOCAL-VARIANT',85,true) returning id",[variantProduct.id]);
  await q('insert into inventory(product_id,quantity) values($1,20)',[simple.id]);await q('insert into inventory(product_id,variant_id,quantity) values($1,$2,20)',[variantProduct.id,variant.id]);
  const policiesBefore=await q("select tablename,policyname,qual,with_check from pg_policies where tablename in ('orders','order_items') order by tablename,policyname");
  const address={first_name:'Local',last_name:'Customer',address_line_1:'12 test street',city:'Rabat',country:'MA'};
  async function create(user,note,product=simple,selectedVariant=null){return (await q('select * from public.create_order_from_cart($1,$2,$3,$4::jsonb,$5::jsonb,$5::jsonb,$6)',[user,'local@example.test','0600000000',JSON.stringify([{product_id:product.id,variant_id:selectedVariant,quantity:2,price:0,grand_total:0}]),JSON.stringify(address),normalizeOrderComment(note)]))[0];}
  const a=await create(users.a,'  Sonnez au portail\r\nMerci. '),b=await create(users.b,'<script>alert(1)</script>'),maximum=await create(users.b,'a'.repeat(1000)),withVariant=await create(users.a,'Variante choisie',variantProduct,variant.id),guest=await create(null,'Guest note');
  const [legacy]=await q('select * from public.create_order_from_cart($1,$2,$3,$4::jsonb,$5::jsonb,$5::jsonb)',[users.a,'local@example.test','0600000000',JSON.stringify([{product_id:simple.id,quantity:1}]),JSON.stringify(address)]);
  await t.test('existing nullable field and comments persist on exactly the correct saved orders',async()=>{
   assert.equal((await q("select is_nullable from information_schema.columns where table_schema='public' and table_name='orders' and column_name='customer_note'"))[0].is_nullable,'YES');
   assert.equal(a.customer_note,'Sonnez au portail\nMerci.');assert.equal(b.customer_note,'<script>alert(1)</script>');assert.equal(maximum.customer_note.length,1000);assert.equal(legacy.customer_note,null);assert.equal(new Set([a,b,maximum,withVariant,guest,legacy].map(o=>o.id)).size,6);
   assert.equal((await q('select customer_note from orders where id=$1',[a.id]))[0].customer_note,a.customer_note);
  });
  await t.test('server-calculated prices, variant SKU and existing inventory reservation behavior remain intact',async()=>{
   assert.equal(Number(a.grand_total),150.5);assert.equal(Number(withVariant.grand_total),170);assert.equal(Number(a.shipping_total),0);
   const [item]=await q('select * from order_items where order_id=$1',[withVariant.id]);assert.equal(item.sku,'LOCAL-VARIANT');assert.equal(item.variant_id,variant.id);assert.equal(Number(item.unit_price),85);
   const [stock]=await q('select quantity,reserved_quantity from inventory where product_id=$1',[simple.id]);assert.equal(stock.quantity,20);assert.equal(stock.reserved_quantity,9);
  });
  async function asCustomer(id){await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
  await t.test('customer A can read only their own order comments and historical orders',async()=>{
   await asCustomer(users.a);assert.deepEqual(new Set((await q('select id from orders')).map(o=>o.id)),new Set([a.id,withVariant.id,legacy.id]));assert.equal((await q('select customer_note from orders where id=$1',[b.id])).length,0);assert.equal((await q('select * from order_items where order_id=$1',[b.id])).length,0);
  });
  await t.test('customer B cannot read customer A or guest comments',async()=>{
   await asCustomer(users.b);assert.deepEqual(new Set((await q('select id from orders')).map(o=>o.id)),new Set([b.id,maximum.id]));assert.equal((await q('select * from orders where id=$1',[a.id])).length,0);assert.equal((await q('select * from orders where id=$1',[guest.id])).length,0);
  });
  await t.test('staff can read saved comments, while anonymous users cannot read any',async()=>{
   await asCustomer(users.admin);assert.equal((await q('select customer_note from orders where id=$1',[a.id]))[0].customer_note,a.customer_note);
   await db.exec('reset role');await q("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role anon');assert.equal((await q('select * from orders')).length,0);await db.exec('reset role');
  });
  await t.test('existing service-only RPC permission and order RLS policies are unchanged',async()=>{
   for(const role of ['anon','authenticated','service_role'])assert.equal((await q("select has_function_privilege($1,'public.create_order_from_cart(uuid,text,text,jsonb,jsonb,jsonb,text)','EXECUTE') allowed",[role]))[0].allowed,role==='service_role');
   assert.deepEqual(await q("select tablename,policyname,qual,with_check from pg_policies where tablename in ('orders','order_items') order by tablename,policyname"),policiesBefore);
  });
 }finally{await db.close();}
});
