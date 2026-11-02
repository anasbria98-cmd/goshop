import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

test('quote migration protects private requests/files, deduplicates and limits submissions', {skip:!process.env.GOELEC_TEST_PGLITE_PATH && 'Set GOELEC_TEST_PGLITE_PATH for isolated PostgreSQL'},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href);const db=new PGlite();
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated,service_role;grant select on storage.objects to anon,authenticated;
 create table categories(id uuid primary key,name text);
 create function public.is_staff() returns boolean language sql stable as $$select coalesce(current_setting('test.staff',true),'false')='true'$$;`);
 await db.exec(await readFile(new URL('../supabase/migrations/202611020001_quote_requests.sql',import.meta.url),'utf8'));
 const input={first_name:'Local',last_name:'Customer',email:'test@example.test',phone:'+212612345678',category_id:'general',category_name:'Générale',subject:'Projet local',message:'Description du projet local.'};
 const call=async(id,hash='same',rate='local')=>(await q('select claim_quote_request($1,$2,$3,$4) as state',[id,hash,rate,input]))[0].state;
 const id='00000000-0000-4000-8000-000000000001';
 await db.exec('set role service_role');assert.equal(await call(id),'claimed');assert.equal(await call(id),'busy');assert.equal(await call(id,'different'),'mismatch');
 await q("update quote_requests set status='failed' where id=$1",[id]);assert.equal(await call(id),'claimed');
 await q("update quote_requests set status='received' where id=$1",[id]);assert.equal(await call(id),'saved');
 assert.equal((await q('select count(*) from quote_requests'))[0].count,1);
 for(let i=2;i<=5;i++) assert.equal(await call(`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`),'claimed');
 assert.equal(await call('00000000-0000-4000-8000-000000000006'),'limited');
 await db.exec('reset role');assert.equal((await q("select public from storage.buckets where id='quote-attachments'"))[0].public,false);
 await q("insert into storage.objects(id,bucket_id,name) values($1,'quote-attachments','private.pdf')",[id]);
 await db.exec('set role anon');await assert.rejects(q('select * from quote_requests'),/permission/);await assert.rejects(call(id),/permission/);assert.equal((await q("select * from storage.objects where bucket_id='quote-attachments'")).length,0);
 await db.exec('set role authenticated');assert.equal((await q('select * from quote_requests')).length,0);await assert.rejects(q("update quote_requests set subject='tamper'"),/permission/);await assert.rejects(call(id),/permission/);
 await q("select set_config('test.staff','true',false)");assert.equal((await q('select * from quote_requests')).length,5);assert.equal((await q("select * from storage.objects where bucket_id='quote-attachments'")).length,1);
 await db.exec('reset role');assert.equal((await q('select count(*) from categories'))[0]?.count??0,0);
 }finally{await db.close();}
});
