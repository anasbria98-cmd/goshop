import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {moveBrandSlot,placeBrandInSlot} from '../lib/brand-layout.ts';
import {featuredBrandSlots} from '../lib/featured-brands.ts';

test('Visual moves swap or fill only the selected cells; available brands cannot duplicate/overwrite',()=>{
 const slots=['a',null,'b',null,'c'];
 assert.deepEqual(moveBrandSlot(slots,0,3),[null,null,'b','a','c']);
 assert.deepEqual(moveBrandSlot(slots,0,4),['c',null,'b',null,'a']);
 assert.deepEqual(slots,['a',null,'b',null,'c']);
 assert.deepEqual(placeBrandInSlot(slots,'d',1),['a','d','b',null,'c']);
 assert.equal(placeBrandInSlot(slots,'a',1),slots);
 assert.equal(placeBrandInSlot(slots,'d',0),slots);
 assert.equal(moveBrandSlot(slots,1,0),slots);
 assert.equal(moveBrandSlot(slots,-1,0),slots);
 assert.deepEqual(featuredBrandSlots([{id:'a',slug:'a',name:'A',logo_url:null,display_order:1}],5).map(b=>b?.id??null),['a',null,null,null,null]);
});

test('Visual layout migration and atomic saves preserve placements, holes, products and staff permissions',{skip:!process.env.GOELEC_TEST_PGLITE_PATH && 'Set GOELEC_TEST_PGLITE_PATH for isolated PostgreSQL'},async t=>{
 const {PGlite}=await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href);
 const db=new PGlite();const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key,bucket_id text,name text);`);
  for(const file of ['202610090001_initial_commerce.sql','202610270001_featured_brand_controls.sql'])await db.exec((await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  const brands=[];
  for(const [i,name]of ['Alpha','Beta','Gamma'].entries()){
   const [b]=await q('insert into brands(name,slug,show_in_featured_brands,display_order) values($1,$1,true,$2) returning *',[name,1+i*2]);brands.push(b);
   await q("insert into products(name,slug,sku,price,brand_id) values($1,$1,$1,10,$2)",[name,b.id]);
  }
  const [a,b,c]=brands.map(b=>b.id),start=[a,null,b,null,c];
  const products=await q('select * from products order by id'),identities=await q('select id,name,slug,logo_url,sort_order from brands order by id');
  await db.exec(await readFile(new URL('../supabase/migrations/202610270002_visual_brand_layout.sql',import.meta.url),'utf8'));
  await db.exec('grant usage on schema public,auth to anon,authenticated;grant select on all tables in schema public to anon;grant all on brands,profiles to authenticated;');
  const users={admin:'00000000-0000-4000-8000-000000000001',customer:'00000000-0000-4000-8000-000000000002',staff:'00000000-0000-4000-8000-000000000003'};
  for(const[role,id]of Object.entries(users)){await q('insert into auth.users(id) values($1)',[id]);await q('update profiles set role=$1 where id=$2',[role,id]);}
  const as=async(role)=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[users[role]??'']);if(role!=='postgres')await db.exec('set role '+(role==='anon'?'anon':'authenticated'));};
  const read=async()=>{
   const [layout]=await q('select slot_count from featured_brand_layout');
   const rows=await q('select id,display_order from brands where show_in_featured_brands order by display_order');
   return Array.from({length:layout.slot_count},(_,i)=>rows.find(b=>b.display_order===i+1)?.id??null);
  };
  const save=(expected,slots)=>q('select save_featured_brand_layout($1::uuid[],$2::uuid[])',[expected,slots]);
  await t.test('migration keeps existing exact slots and relationships; public can read but cannot write',async()=>{
   assert.deepEqual(await read(),start);assert.deepEqual(await q('select * from products order by id'),products);
   await as('anon');assert.equal((await q('select slot_count from featured_brand_layout'))[0].slot_count,5);await assert.rejects(save(start,[]),/permission/);await assert.rejects(q('update featured_brand_layout set slot_count=0'),/permission/);
   await as('customer');await assert.rejects(save(start,[]),/FORBIDDEN/);assert.equal((await q('update featured_brand_layout set slot_count=0 returning id')).length,0);
  });
  await t.test('occupied drag targets swap atomically without shifting other slots',async()=>{
   await as('admin');const untouched=(await q('select * from brands where id=$1',[b]))[0];const swapped=moveBrandSlot(start,0,4);await save(start,swapped);assert.deepEqual(await read(),swapped);assert.deepEqual((await q('select * from brands where id=$1',[b]))[0],untouched);await save(swapped,start);
  });
  await t.test('missing/duplicate IDs, stale clients and invalid dimensions fail without partial writes',async()=>{
   await assert.rejects(save(start,[a,a]),/DUPLICATE/);
   await assert.rejects(save(start,[a,'00000000-0000-4000-8000-000000000099']),/NOT_FOUND/);
   await assert.rejects(save([],start),/CHANGED/);
   await assert.rejects(save(start,Array(1001).fill(null)),/INVALID/);
   await assert.rejects(q("select save_featured_brand_layout($1::uuid[],array[[$2,$3]]::uuid[])",[start,a,b]),/INVALID/);
   assert.deepEqual(await read(),start);
  });
  await t.test('remove and reopen retains all trailing holes; available/new brands need explicit placement',async()=>{
   const withoutLast=[a,null,b,null,null];await save(start,withoutLast);assert.deepEqual(await read(),withoutLast);
   const [fresh]=await q("insert into brands(name,slug) values('Fresh','fresh') returning *");assert.equal(fresh.show_in_featured_brands,false);assert.equal(fresh.display_order,null);assert.deepEqual(await read(),withoutLast);
   const added=placeBrandInSlot(withoutLast,fresh.id,3);await save(withoutLast,added);assert.deepEqual(await read(),added);
   await save(added,start);
  });
  await t.test('fully empty grids retain their saved extent and can be explicitly resized to zero',async()=>{
   const empty=Array(5).fill(null);await save(start,empty);assert.deepEqual(await read(),empty);await save(empty,[]);assert.deepEqual(await read(),[]);await save([],start);
  });
  await t.test('staff can save; unrelated brand data and all product relations stay intact',async()=>{
   await as('staff');await save(start,start);await as('postgres');assert.deepEqual(await q('select * from products order by id'),products);
   for(const row of identities)assert.deepEqual((await q('select id,name,slug,logo_url,sort_order from brands where id=$1',[row.id]))[0],row);
  });
 }finally{await db.close();}
});
