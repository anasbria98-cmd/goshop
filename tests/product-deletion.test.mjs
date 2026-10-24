import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

test('Permanent product deletion is transactional, admin-only, and protects history', {skip:!process.env.GOELEC_TEST_PGLITE_PATH && 'Set GOELEC_TEST_PGLITE_PATH for isolated PostgreSQL'},async t=>{
 const {PGlite}=await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href);
 const db=new PGlite();const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',current_user)$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid primary key,bucket_id text,name text);alter table storage.objects enable row level security;`);
  for(const file of ['202610090001_initial_commerce.sql','202610090002_secure_checkout.sql','202610090003_order_workflow.sql','202610140001_appareillage_color_variants.sql','202610160001_homepage_sliders.sql','202610240003_safe_product_deletion.sql']) await db.exec((await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
  await db.exec('grant usage on schema public,auth to anon,authenticated;grant select on all tables in schema public to anon;grant all on all tables in schema public to authenticated;grant usage,select on all sequences in schema public to authenticated;');
  const users={admin:'00000000-0000-4000-8000-000000000001',staff:'00000000-0000-4000-8000-000000000002',customer:'00000000-0000-4000-8000-000000000003',super_admin:'00000000-0000-4000-8000-000000000004'};
  for(const [role,id] of Object.entries(users)){await q('insert into auth.users(id) values($1)',[id]);await q('update profiles set role=$1 where id=$2',[role,id]);}
  const as=async(role)=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub',$1,false)",[users[role]??'']);await db.exec('set role '+(role==='anon'?'anon':'authenticated'));};
  const create=async(status='draft')=>{await db.exec('reset role');await q("select set_config('request.jwt.claim.sub','',false)");return (await q("insert into products(name,slug,sku,price,status,published_at) values('Delete fixture',gen_random_uuid()::text,gen_random_uuid()::text,10,$1,now()) returning *",[status]))[0];};
  const remove=(p,confirmation=true,name=p.name,sku=p.sku)=>q('select delete_product_safely($1,$2,$3,$4)',[p.id,name,sku,confirmation]);
  const keep=await create('active');const [category]=await q("insert into categories(name,slug) values('Keep category','keep-category') returning *");
  await t.test('anonymous, customer and staff cannot invoke deletion; raw admin/staff DELETE is unavailable',async()=>{
   const p=await create();
   for(const role of ['anon','customer','staff']) {await as(role);await assert.rejects(remove(p),/permission|FORBIDDEN/);if(role==='anon') await assert.rejects(q('delete from products where id=$1 returning id',[p.id]),/permission/);else assert.equal((await q('delete from products where id=$1 returning id',[p.id])).length,0);}
   await as('admin');assert.equal((await q('delete from products where id=$1 returning id',[p.id])).length,0);
   await assert.rejects(remove(p,false),/CONFIRMATION/);await assert.rejects(remove(p,true,'stale'),/CHANGED/);
   await remove(p);await assert.rejects(remove(p),/NOT_FOUND/);
  });
  await t.test('staff retain ordinary product creation and editing permissions',async()=>{
   await as('staff');
   const [p]=await q("insert into products(name,slug,sku,price) values('Staff fixture',gen_random_uuid()::text,gen_random_uuid()::text,10) returning *");
   assert.equal((await q('update products set price=12 where id=$1 returning price',[p.id]))[0].price,'12.00');
   await as('admin');await remove(p);
  });
  await t.test('all statuses delete safe owned relations without changing other products/categories',async()=>{
   for(const status of ['active','draft','archived']){
    const p=await create(status);
    const [variant]=await q("insert into product_variants(product_id,name,sku) values($1,'Red',gen_random_uuid()::text) returning id",[p.id]);
    await q('insert into inventory(product_id,variant_id,quantity) values($1,$2,4)',[p.id,variant.id]);
    await q('insert into product_categories(product_id,category_id) values($1,$2)',[p.id,category.id]);
    await q("insert into product_images(product_id,storage_path) values($1,'shared-library/image.png')",[p.id]);
    await q('insert into favorites(product_id,user_id) values($1,$2)',[p.id,users.customer]);
    await q("insert into reviews(product_id,user_id,rating,content) values($1,$2,5,'Local test')",[p.id,users.customer]);
    const [cart]=await q("insert into carts(session_id) values(gen_random_uuid()) returning id");
    await q('insert into cart_items(cart_id,product_id,variant_id,quantity) values($1,$2,$3,1)',[cart.id,p.id,variant.id]);
    await as(status==='archived'?'super_admin':'admin');await remove(p);
    for(const table of ['products','product_categories','product_images','product_variants','inventory','reviews','favorites','cart_items']){
     assert.equal((await q(`select count(*)::int n from ${table} where ${table==='products'?'id':'product_id'}=$1`,[p.id]))[0].n,0);
    }
    await db.exec('reset role');assert.deepEqual((await q('select * from products where id=$1',[keep.id]))[0],keep);assert.deepEqual((await q('select * from categories where id=$1',[category.id]))[0],category);
   }
  });
  await t.test('orders and order items stay byte-for-byte unchanged when deletion is attempted',async()=>{
   const p=await create('active');await q('insert into inventory(product_id,quantity) values($1,10)',[p.id]);
   await q("select * from create_order_from_cart(null,'local@example.invalid','0600000000',$1::jsonb,'{}','{}',null)",[JSON.stringify([{product_id:p.id,quantity:1}])]);
   const orders=await q('select * from orders order by id'),items=await q('select * from order_items order by id');
   await as('admin');await assert.rejects(remove(p),/ORDER_HISTORY|STOCK_HISTORY/);
   await db.exec('reset role');assert.deepEqual(await q('select * from orders order by id'),orders);assert.deepEqual(await q('select * from order_items order by id'),items);assert.equal((await q('select count(*)::int n from products where id=$1',[p.id]))[0].n,1);
  });
  await t.test('cross-product variant references block cascades into another product',async()=>{
   const p=await create();
   const [v]=await q("insert into product_variants(product_id,name,sku) values($1,'Fixture',gen_random_uuid()::text) returning id",[p.id]);
   await assert.rejects(q('insert into inventory(product_id,variant_id,quantity) values($1,$2,3)',[keep.id,v.id]),/does not belong/);
   // Simulate corrupt legacy data only inside this disposable in-memory database.
   await db.exec('alter table inventory disable trigger inventory_validate');
   await q('insert into inventory(product_id,variant_id,quantity) values($1,$2,3)',[keep.id,v.id]);
   await db.exec('alter table inventory enable trigger inventory_validate');
   const before=await q('select * from inventory where product_id=$1',[keep.id]);
   await as('admin');await assert.rejects(remove(p),/SHARED_RELATION/);await db.exec('reset role');assert.deepEqual(await q('select * from inventory where product_id=$1',[keep.id]),before);
  });
  await t.test('reserved stock, stock history and linked banners block deletion with no partial cleanup',async()=>{
   for(const kind of ['reserved','movement','banner']){
    const p=await create();await q('insert into inventory(product_id,quantity,reserved_quantity) values($1,5,$2)',[p.id,kind==='reserved'?1:0]);
    if(kind==='movement')await q("insert into inventory_movements(product_id,type,quantity_change,previous_quantity,new_quantity) values($1,'purchase',5,0,5)",[p.id]);
    if(kind==='banner')await q("insert into homepage_slides(name,alt,image_url,location,product_id) values('Banner','Banner','/promotions/test.png','primary',$1)",[p.id]);
    const before=await q('select * from inventory where product_id=$1',[p.id]);
    await as('admin');await assert.rejects(remove(p),/RESERVED_STOCK|STOCK_HISTORY|SLIDER_REFERENCE/);await db.exec('reset role');assert.deepEqual(await q('select * from inventory where product_id=$1',[p.id]),before);
   }
  });
 }finally{await db.close();}
});
