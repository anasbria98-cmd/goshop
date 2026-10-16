import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { legacySlides, moveSlide, safeSlideLink } from '../lib/home-slides.ts';

test('Slider destinations reject executable URLs, protocol-relative links and credentials', () => {
  for (const link of ['/categorie/appareillage/lap/galaxy','/produit/existing','/recherche?q=Omega%20blanc','https://goelec.ma/']) assert.equal(safeSlideLink(link),true,link);
  for (const link of ['javascript:alert(1)','data:text/html,test','//evil.test','/\\evil.test','https://name:secret@example.com','https://example.com/a b','']) assert.equal(safeSlideLink(link),false,link);
});
test('Slider move operations keep all records and originals without changing the other location', () => {
  assert.deepEqual(legacySlides.map(s=>s.slug),['omega','galaxy','karla','millenium']);
  const rows=[{id:'omega'},{id:'galaxy'},{id:'third'}];
  assert.deepEqual(moveSlide(rows,'third','omega').map(s=>s.id),['third','omega','galaxy']);
  assert.deepEqual(rows.map(s=>s.id),['omega','galaxy','third']);
  assert.deepEqual(moveSlide(rows,'not-in-this-location','omega'),rows);
});

test('Slider migration: exact preservation, public active reads, admin-only writes, storage policy and atomic ordering', {skip: !process.env.GOELEC_TEST_PGLITE_PATH && 'Set GOELEC_TEST_PGLITE_PATH for isolated PostgreSQL integration'}, async () => {
  const {PGlite}=await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href);
  const db=new PGlite();
  const q=async(sql,args=[]) => (await db.query(sql,args)).rows;
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema storage;
      create table public.categories(id uuid primary key default gen_random_uuid(),slug text unique);
      create table public.products(id uuid primary key default gen_random_uuid());
      create function public.is_admin() returns boolean language sql stable as $$select coalesce(current_setting('test.role',true) in ('admin','super_admin'),false)$$;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema public,storage to anon,authenticated;
      grant select on storage.objects to anon;
      grant select,insert,update,delete on storage.objects to authenticated;
      insert into categories(slug) values('omega'),('galaxy'),('karla'),('millenium');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202610160001_homepage_sliders.sql',import.meta.url),'utf8'));
    const original=await q('select name,image_url,location,sort_order from homepage_slides order by location,sort_order');
    assert.deepEqual(original.map(s=>s.image_url),['/promotions/omega.png','/promotions/galaxy.png','/promotions/karla.png','/promotions/millenium.png']);
    assert.deepEqual(original.map(s=>s.sort_order),[0,1,0,1]);
    const ids=(await q("select id from homepage_slides where location='primary' order by sort_order")).map(s=>s.id);
    await db.exec("set role authenticated; select set_config('test.role','staff',false)");
    await assert.rejects(q("insert into homepage_slides(name,alt,image_url,location) values('blocked','blocked','/promotions/omega.png','primary')"),/row-level security/);
    await assert.rejects(q("insert into storage.objects(bucket_id,name) values('homepage-slides','blocked.png')"),/row-level security/);
    await assert.rejects(q("select reorder_homepage_slides('primary',$1)",[ids]),/Administrator required/);
    assert.equal((await q("update homepage_slides set name='blocked' returning id")).length,0);
    await db.exec("select set_config('test.role','admin',false)");
    const [newSlide]=await q("insert into homepage_slides(name,alt,image_url,location,is_active) values('Test','Test','/promotions/omega.png','secondary',false) returning id");
    await q("insert into storage.objects(bucket_id,name) values('homepage-slides','allowed.png')");
    await q("select reorder_homepage_slides('primary',$1)",[[...ids].reverse()]);
    assert.deepEqual((await q("select id from homepage_slides where location='primary' order by sort_order")).map(s=>s.id),[...ids].reverse());
    await assert.rejects(q("select reorder_homepage_slides('primary',$1)",[[ids[0],ids[0]]]),/Slides changed/);
    await assert.rejects(q("select reorder_homepage_slides('primary',$1)",[[ids[0]]]),/Slides changed/);
    await assert.rejects(q("select reorder_homepage_slides('primary',$1)",[[ids[0],newSlide.id]]),/Slides changed/);
    assert.deepEqual((await q("select id from homepage_slides where location='primary' order by sort_order")).map(s=>s.id),[...ids].reverse());
    assert.equal((await q('select id from homepage_slides')).length,5);
    await db.exec("reset role; set role anon");
    assert.equal((await q('select id from homepage_slides')).length,4);
    await assert.rejects(q("delete from homepage_slides"),/permission denied/);
    await db.exec("reset role; set role authenticated; select set_config('test.role','customer',false)");
    assert.equal((await q('select id from homepage_slides')).length,4);
    assert.equal((await q('delete from homepage_slides returning id')).length,0);
    await db.exec("select set_config('test.role','super_admin',false)");
    await q("update homepage_slides set is_active=true,name='Edited' where id=$1",[newSlide.id]);
    assert.equal((await q("select name from homepage_slides where id=$1",[newSlide.id]))[0].name,'Edited');
    await q('delete from homepage_slides where id=$1',[newSlide.id]);
    assert.equal((await q('select id from homepage_slides')).length,4);
  } finally { await db.close(); }
});
