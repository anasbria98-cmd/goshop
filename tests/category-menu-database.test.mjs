import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
test('Category menu migration preserves assignments, restricts writes, and supports hierarchy edits', {skip:!process.env.GOELEC_TEST_PGLITE_PATH && 'Set GOELEC_TEST_PGLITE_PATH for isolated PostgreSQL'},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href);
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
  create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key,bucket_id text,name text);alter table storage.objects enable row level security;`);
  await db.exec((await readFile(new URL('../supabase/migrations/202610090001_initial_commerce.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
  const [root]=await q("insert into categories(name,slug) values('Éclairage','eclairage') returning *");
  const [child]=await q("insert into categories(name,slug,parent_id) values('Intérieur','interieur',$1) returning *",[root.id]);
  const [product]=await q("insert into products(name,slug,sku,price) values('Existing','existing','EXISTING',20) returning *");
  await q('insert into product_categories(product_id,category_id,is_primary) values($1,$2,true)',[product.id,child.id]);
  const before=await q('select * from product_categories');
  const policies=await q("select * from pg_policies where tablename='categories' order by policyname");
  await db.exec(await readFile(new URL('../supabase/migrations/202610240002_category_menu_controls.sql',import.meta.url),'utf8'));
  assert.deepEqual(await q('select * from product_categories'),before);
  assert.deepEqual(await q('select * from products'),[product]);
  assert.deepEqual(await q("select * from pg_policies where tablename='categories' order by policyname"),policies);
  assert.equal((await q('select * from categories where id=$1',[root.id]))[0].show_in_top_navigation,true);
  await q("update categories set sort_order=23,show_in_all_categories=false,show_in_mobile_menu=false where id=$1",[child.id]);
  await q("insert into categories(name,slug,parent_id) values('Nested','nested',$1)",[child.id]);
  await assert.rejects(q('update categories set parent_id=$1 where id=$2',[child.id,root.id]),/cycle/i);
  await q('update categories set parent_id=null where id=$1',[child.id]);
  assert.deepEqual(await q('select * from product_categories'),before);
  await db.exec('grant usage on schema public,auth to anon,authenticated;grant select on categories to anon;grant all on categories to authenticated;set role anon;');
  assert.ok((await q('select * from categories')).length);
  await assert.rejects(q("insert into categories(name,slug) values('Denied','denied')"),/permission|policy/i);
  await db.exec('reset role;set role authenticated;');
  await assert.rejects(q("insert into categories(name,slug) values('Denied','denied')"),/policy/i);
 } finally {await db.close();}
});
