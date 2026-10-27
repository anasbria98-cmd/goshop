import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {featuredBrandSlots} from '../lib/featured-brands.ts';

const brand=(id,display_order)=>({id,name:id,slug:id,logo_url:null,display_order});
test('Featured logo positions preserve gaps, ignore invalid slots and prevent duplicates',()=>{
 const a=brand('a',1),b=brand('b',4);
 assert.deepEqual(featuredBrandSlots([b,a,brand('a',2),brand('other',4),brand('bad',null),brand('bad2',1001)]),[a,null,null,b]);
 assert.deepEqual(featuredBrandSlots([]),[]);
});

test('Featured brand migration captures legacy positions and keeps catalogue relationships intact', {skip:!process.env.GOELEC_TEST_PGLITE_PATH && 'Set GOELEC_TEST_PGLITE_PATH for isolated PostgreSQL'},async t=>{
 const {PGlite}=await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href);
 const db=new PGlite();const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key,bucket_id text,name text);`);
  await db.exec((await readFile(new URL('../supabase/migrations/202610090001_initial_commerce.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  // Existing real Ingelec followed by legacy Wago substitution: keep the duplicate's slot empty.
  const slugs=['ingelec','goled','philips','ja-solar','wago','schneider-electric','hager'];
  for(const [i,slug]of slugs.entries()){
   const [b]=await q('insert into brands(name,slug,sort_order) values($1,$1,$2) returning id',[slug,40-i]);
   await q("insert into products(name,slug,sku,price,brand_id,status,published_at,created_at) values($1,$1,$1,10,$2,'active',now(),$3)",[slug,b.id,new Date(Date.UTC(2026,9,20,0,0,slugs.length-i)).toISOString()]);
  }
  const before=await q('select * from products order by id');
  const identities=await q('select id,name,slug,logo_url,sort_order from brands order by id');
  await db.exec(await readFile(new URL('../supabase/migrations/202610270001_featured_brand_controls.sql',import.meta.url),'utf8'));
  await t.test('legacy substitutions captured once without shifting later logos or changing products',async()=>{
   assert.deepEqual(await q('select slug,display_order from brands where show_in_featured_brands order by display_order'),[
    {slug:'ingelec',display_order:1},{slug:'goled',display_order:2},{slug:'philips',display_order:3},{slug:'schneider-electric',display_order:4},{slug:'hager',display_order:6},{slug:'ingco',display_order:7}]);
   assert.deepEqual(await q('select * from products order by id'),before);
   for(const row of identities)assert.deepEqual((await q('select id,name,slug,logo_url,sort_order from brands where id=$1',[row.id]))[0],row);
  });
  await t.test('new brands remain hidden and unpositioned even after adding an active product',async()=>{
   const [b]=await q("insert into brands(name,slug) values('New brand','new-brand') returning *");
   assert.equal(b.show_in_featured_brands,false);assert.equal(b.display_order,null);
   await q("insert into products(name,slug,sku,price,brand_id,status,published_at) values('New','new','new',10,$1,'active',now())",[b.id]);
   assert.equal((await q('select count(*)::int n from brands where show_in_featured_brands'))[0].n,6);
  });
  await t.test('explicit positions, uniqueness and hide/show work without automatically moving other brands',async()=>{
   await assert.rejects(q("update brands set show_in_featured_brands=true where slug='new-brand'"),/required/);
   await assert.rejects(q("update brands set display_order=0 where slug='new-brand'"),/range/);
   await assert.rejects(q("update brands set display_order=1,show_in_featured_brands=true where slug='new-brand'"),/brands_featured_position/);
   await q("update brands set display_order=9,show_in_featured_brands=true where slug='new-brand'");
   await q("update brands set show_in_featured_brands=false where slug='goled'");
   assert.equal((await q("select display_order from brands where slug='philips'"))[0].display_order,3);
   await q("update brands set show_in_featured_brands=true where slug='goled'");
   assert.equal((await q("select display_order from brands where slug='goled'"))[0].display_order,2);
  });
  await t.test('existing RLS prevents anonymous and customer configuration writes',async()=>{
   await db.exec('grant usage on schema public,auth to anon,authenticated;grant select,update on brands to anon,authenticated;grant select on profiles to authenticated;set role anon');
   assert.equal((await q("update brands set display_order=99 where slug='philips' returning id")).length,0);
   await db.exec('set role authenticated');assert.equal((await q("update brands set display_order=99 where slug='philips' returning id")).length,0);await db.exec('reset role');
  });
 }finally{await db.close();}
});
