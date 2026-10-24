import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Optional test-only Postgres runtime. No package is added to the application.
// GOELEC_TEST_PGLITE_PATH=/absolute/path/to/pglite/dist/index.js npm test
test('Appareillage migration, staff security, cart/order snapshots and variant inventory', {skip: !process.env.GOELEC_TEST_PGLITE_PATH && 'Set GOELEC_TEST_PGLITE_PATH to run isolated PostgreSQL integration tests'}, async (t) => {
  const { PGlite } = await import(pathToFileURL(process.env.GOELEC_TEST_PGLITE_PATH).href);
  const db = new PGlite();
  const user = '00000000-0000-4000-8000-000000000099';
  const q = async (sql, values=[]) => (await db.query(sql,values)).rows;
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('role',current_user)$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;`);
    for (const name of ['202610090001_initial_commerce.sql','202610090002_secure_checkout.sql','202610090003_order_workflow.sql']) {
      // gen_random_uuid is built into this runtime; pgcrypto itself is not needed by these migrations.
      await db.exec((await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
    }
    await db.exec(`grant usage on schema public,auth,storage to anon,authenticated,service_role;
      grant all on all tables in schema public to authenticated,service_role;
      grant select on all tables in schema public to anon;
      grant select,insert,update,delete on storage.objects to authenticated;
      grant select on storage.objects to anon;
      grant usage,select on all sequences in schema public to authenticated,service_role;`);
    await q('insert into auth.users(id) values($1)',[user]);
    await q("update public.profiles set role='super_admin' where id=$1",[user]);
    const [root] = await q("insert into public.categories(name,slug) values('Appareillage','appareillage') returning id");
    const [child] = await q("insert into public.categories(name,slug,parent_id) values('Galaxy','galaxy',$1) returning id",[root.id]);
    const [other] = await q("insert into public.categories(name,slug) values('Autre','eclairage') returning id");
    const [existing] = await q("insert into public.products(name,slug,sku,price,status,published_at) values('Existant','existing','BASE',30,'active',now()) returning *");
    const [simple] = await q("insert into public.products(name,slug,sku,price,status,published_at) values('Simple','simple','SIMPLE',15,'active',now()) returning *");
    await q('insert into public.product_categories(product_id,category_id,is_primary) values($1,$2,true),($3,$4,true)',[existing.id,child.id,simple.id,other.id]);
    await q('insert into public.inventory(product_id,quantity) values($1,20),($2,5)',[existing.id,simple.id]);
    const [legacy] = await q("insert into public.product_variants(product_id,name,sku,price,cost_price) values($1,'Historique','LEGACY',21,8) returning *",[existing.id]);
    const beforeStocks = await q('select * from inventory order by id');
    const policies = await q('select schemaname,tablename,policyname,qual,with_check from pg_policies order by schemaname,tablename,policyname');
    await db.exec(await readFile(new URL('../supabase/migrations/202610140001_appareillage_color_variants.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/202610240001_product_display_colors.sql',import.meta.url),'utf8'));
    await t.test('Display colors persist independently on existing products without changing price, stock or variants', async()=>{
      const colors={enabled:true,colors:[{name:'Cuivre personnalisé',hex:'#bc7341'}]};
      await q('update public.products set display_colors=$1::jsonb where id=$2',[JSON.stringify(colors),simple.id]);
      let [saved]=await q('select display_colors,price from public.products where id=$1',[simple.id]);
      assert.deepEqual(saved.display_colors,colors);assert.equal(Number(saved.price),15);
      await q('update public.products set display_colors=$1::jsonb where id=$2',[JSON.stringify({...colors,enabled:false}),simple.id]);
      [saved]=await q('select display_colors from public.products where id=$1',[simple.id]);
      assert.equal(saved.display_colors.enabled,false);
      await q('update public.products set display_colors=null where id=$1',[simple.id]);
    });
    await q("select set_config('request.jwt.claim.sub',$1,false)",[user]);
    await db.exec("set role authenticated");
    const variant = (sku,color,stock=3) => ({name:color,color_name:color,color_hex:'#ffffff',finish:'Mat',image_path:'variants/white.png',sku,barcode:'',price:45,is_active:true,stock,expected_stock:null});
    await q("insert into storage.objects(bucket_id,name) values('product-images','variants/white.png'),('product-images','variants/black.png')");
    const save = (productId,rows) => q('select public.save_product_color_variants($1,$2::jsonb)',[productId,JSON.stringify(rows)]);
    const order = (items) => q("select * from public.create_order_from_cart(null,'test@example.invalid','0600000000',$1::jsonb,'{}','{}',null)",[JSON.stringify(items)]);

    await t.test('migration preserves existing records, quantities, prices and every RLS policy', async () => {
      assert.deepEqual(await q('select * from inventory order by id'),beforeStocks);
      const [after] = await q('select * from product_variants where id=$1',[legacy.id]);
      for (const [key,value] of Object.entries(legacy)) assert.deepEqual(after[key],value,key);
      assert.equal(after.color_name,null);
      assert.deepEqual(await q('select schemaname,tablename,policyname,qual,with_check from pg_policies order by schemaname,tablename,policyname'),policies);
    });
    await t.test('existing Appareillage descendant accepts actual image metadata and independent stocks', async () => {
      await save(existing.id,[variant('WHITE','Blanc'),{...variant('BLACK','Noir',2),color_hex:'#000000',image_path:'variants/black.png',price:60}]);
      const rows = await q('select v.*,i.quantity from product_variants v join inventory i on i.variant_id=v.id where v.product_id=$1 order by v.sku',[existing.id]);
      assert.deepEqual(rows.map(v=>[v.sku,Number(v.price),v.quantity]),[['BLACK',60,2],['WHITE',45,3]]);
      assert.equal((await q('select quantity from inventory where product_id=$1 and variant_id is null',[existing.id]))[0].quantity,20);
    });
    const [white] = await q("select * from product_variants where sku='WHITE'");
    const [black] = await q("select * from product_variants where sku='BLACK'");
    await t.test('existing legacy variants can gain color metadata without losing IDs, cost or compare prices', async () => {
      await q('update product_variants set compare_at_price=25 where id=$1',[legacy.id]);
      await save(existing.id,[{...variant('LEGACY','Gris',1),id:legacy.id,price:21}]);
      const [converted] = await q('select * from product_variants where id=$1',[legacy.id]);
      assert.equal(converted.id,legacy.id); assert.equal(Number(converted.cost_price),8); assert.equal(Number(converted.compare_at_price),25);
      await save(existing.id,[{...variant('LEGACY','Gris'),id:legacy.id,stock:null,is_active:false,price:21}]);
    });
    await t.test('new products save colors atomically, while non-Appareillage, wrong IDs and missing images fail', async () => {
      const payload = {display_colors:{enabled:true,colors:[{name:'Cuivre',hex:'#bc7341'}]},name:'Nouveau',slug:'new',sku:'NEW',price:30,tax_rate:20,status:'active',published_at:new Date().toISOString(),stock_tracking:true,allow_backorder:false,featured:false,is_new:false,is_best_seller:false,is_on_sale:false};
      const saveNew = (slug,rows) => q('select public.save_product_with_color_variants(null,$1::jsonb,$2::uuid[],$3,0,5,$4::jsonb) id',[JSON.stringify({...payload,slug,sku:slug}),[child.id],child.id,JSON.stringify(rows)]);
      const [saved] = await saveNew('new-product',[variant('NEW-W','Blanc'),variant('NEW-C','Champagne')]);
      assert.equal((await q('select count(*)::int n from product_variants where product_id=$1',[saved.id]))[0].n,2);
      assert.deepEqual((await q('select display_colors from products where id=$1',[saved.id]))[0].display_colors,payload.display_colors);
      const {display_colors,...legacyPayload}=payload;
      await q('select public.save_product_with_color_variants($1,$2::jsonb,$3::uuid[],$4,0,5,$5::jsonb)',[saved.id,JSON.stringify({...legacyPayload,slug:'new-product',sku:'new-product'}),[child.id],child.id,'[]']);
      assert.deepEqual((await q('select display_colors from products where id=$1',[saved.id]))[0].display_colors,display_colors);
      const disabledColors={...display_colors,enabled:false};
      await q('select public.save_product_with_color_variants($1,$2::jsonb,$3::uuid[],$4,0,5,$5::jsonb)',[saved.id,JSON.stringify({...payload,slug:'new-product',sku:'new-product',display_colors:disabledColors}),[child.id],child.id,'[]']);
      assert.deepEqual((await q('select display_colors from products where id=$1',[saved.id]))[0].display_colors,disabledColors);
      await assert.rejects(saveNew('rollback-product',[variant('NEW-W','Blanc')]),/unique constraint/);
      assert.equal((await q("select count(*)::int n from products where slug='rollback-product'"))[0].n,0);
      await assert.rejects(save(simple.id,[variant('OTHER','Blanc')]),/Appareillage/);
      await assert.rejects(save(existing.id,[{...variant('BAD','Blanc'),id:crypto.randomUUID()}]),/n’appartient/);
      await assert.rejects(save(existing.id,[{...variant('BAD','Blanc'),image_path:'variants/missing.png'}]),/introuvable/);
    });
    await t.test('checkout rejects client execution, absent, wrong, and disabled variants', async () => {
      await assert.rejects(order([{product_id:existing.id,variant_id:white.id,quantity:1}]),/permission denied/);
      await db.exec('reset role; set role service_role');
      await assert.rejects(order([{product_id:existing.id,quantity:1}]),/Choisissez une couleur/);
      await assert.rejects(order([{product_id:simple.id,variant_id:white.id,quantity:1}]),/Variante indisponible/);
      await assert.rejects(order([{product_id:existing.id,variant_id:legacy.id,quantity:1}]),/Couleur indisponible/);
    });
    let placed;
    await t.test('selected SKU, color, image and price are snapshotted; only variant stock is reserved', async () => {
      [placed] = await order([{product_id:existing.id,variant_id:white.id,quantity:2},{product_id:existing.id,variant_id:black.id,quantity:1}]);
      assert.equal(Number(placed.grand_total),150);
      const rows = await q('select * from order_items where order_id=$1 order by sku',[placed.id]);
      assert.deepEqual(rows.map(v=>[v.sku,v.variant_name,Number(v.unit_price),v.quantity]),[['BLACK','Noir',60,1],['WHITE','Blanc',45,2]]);
      assert.equal(rows[1].product_snapshot.image_path,'variants/white.png');
      assert.equal(rows[1].product_snapshot.color_name,'Blanc');
      assert.equal((await q('select reserved_quantity from inventory where variant_id=$1',[white.id]))[0].reserved_quantity,2);
      assert.equal((await q('select reserved_quantity from inventory where product_id=$1 and variant_id is null',[existing.id]))[0].reserved_quantity,0);
    });
    await t.test('repeated checkout and duplicate lines cannot oversell; failed orders leave reservations unchanged', async () => {
      const count = (await q('select count(*)::int n from orders'))[0].n;
      await assert.rejects(order([{product_id:existing.id,variant_id:white.id,quantity:2}]),/Stock insuffisant/);
      await assert.rejects(order([{product_id:existing.id,variant_id:white.id,quantity:1},{product_id:existing.id,variant_id:white.id,quantity:1}]),/Stock insuffisant/);
      assert.equal((await q('select count(*)::int n from orders'))[0].n,count);
      assert.equal((await q('select reserved_quantity from inventory where variant_id=$1',[white.id]))[0].reserved_quantity,2);
    });
    await t.test('cart storage keeps two colors of the same product separate', async () => {
      const [cart] = await q("insert into carts(session_id) values(gen_random_uuid()) returning id");
      await q('insert into cart_items(cart_id,product_id,variant_id,quantity) values($1,$2,$3,1),($1,$2,$4,2)',[cart.id,existing.id,white.id,black.id]);
      const cartItems = await q('select variant_id,quantity from cart_items where cart_id=$1 order by quantity',[cart.id]);
      assert.deepEqual(cartItems,[{variant_id:white.id,quantity:1},{variant_id:black.id,quantity:2}]);
    });
    await t.test('simple products still use their base SKU/price/stock', async () => {
      const [placedSimple] = await order([{product_id:simple.id,quantity:1}]);
      const [item] = await q('select * from order_items where order_id=$1',[placedSimple.id]);
      assert.equal(item.variant_id,null); assert.equal(item.sku,'SIMPLE'); assert.equal(Number(item.unit_price),15);
      assert.equal((await q('select reserved_quantity from inventory where product_id=$1',[simple.id]))[0].reserved_quantity,1);
    });
    await db.exec('reset role; set role authenticated');
    await t.test('variant edits preserve stock unless explicitly adjusted; stale stock and reserved reductions reject atomically', async () => {
      await save(existing.id,[{...variant('WHITE','Blanc'),id:white.id,stock:null,expected_stock:3,price:50}]);
      assert.equal((await q('select quantity from inventory where variant_id=$1',[white.id]))[0].quantity,3);
      await assert.rejects(save(existing.id,[{...variant('WHITE','Blanc',1),id:white.id,expected_stock:3}]),/réservées/);
      await assert.rejects(save(existing.id,[{...variant('WHITE','Blanc',4),id:white.id,expected_stock:2}]),/stock a changé/);
      assert.equal(Number((await q('select price from product_variants where id=$1',[white.id]))[0].price),50);
    });
    await t.test('existing order workflow ships and reverses the selected inventory, not the base product', async () => {
      await q("select public.admin_update_order_status($1,'confirmed',null)",[placed.id]);
      await q("select public.admin_update_order_status($1,'processing',null)",[placed.id]);
      await q("select public.admin_update_order_status($1,'shipped',null)",[placed.id]);
      assert.equal((await q('select quantity from inventory where variant_id=$1',[white.id]))[0].quantity,1);
      assert.equal((await q('select reserved_quantity from inventory where variant_id=$1',[white.id]))[0].reserved_quantity,0);
      await q("select public.admin_update_order_status($1,'refunded',null)",[placed.id]);
      assert.equal((await q('select quantity from inventory where variant_id=$1',[white.id]))[0].quantity,3);
      assert.equal((await q('select quantity from inventory where product_id=$1 and variant_id is null',[existing.id]))[0].quantity,20);
    });
    await t.test('disabling preserves variants and order history; customers cannot edit colors', async () => {
      await save(existing.id,[{...variant('WHITE','Blanc'),id:white.id,stock:null,expected_stock:3,is_active:false}]);
      assert.equal((await q('select id from product_variants where id=$1',[white.id]))[0].id,white.id);
      await db.exec('reset role; set role service_role');
      await assert.rejects(order([{product_id:existing.id,variant_id:white.id,quantity:1}]),/Couleur indisponible/);
      const [snapshot] = await q('select product_snapshot from order_items where order_id=$1 and variant_id=$2',[placed.id,white.id]);
      assert.equal(snapshot.product_snapshot.unit_price,45);
      await db.exec('reset role; set role authenticated');
      await q("select set_config('request.jwt.claim.sub','',false)");
      await assert.rejects(save(existing.id,[variant('UNAUTHORIZED','Rouge')]),/non autorisé/);
    });
    await t.test('all disabled colors remain unavailable publicly and cannot be purchased as a base SKU', async () => {
      await db.exec('reset role; set role authenticated');
      await q("select set_config('request.jwt.claim.sub',$1,false)",[user]);
      await save(existing.id,[{...variant('BLACK','Noir'),id:black.id,stock:null,price:60,is_active:false}]);
      await db.exec('reset role; set role anon');
      await q("select set_config('request.jwt.claim.sub','',false)");
      assert.equal((await q('select count(*)::int n from product_variants where product_id=$1',[existing.id]))[0].n,0);
      assert.equal((await q('select color_variants_enabled from products where id=$1',[existing.id]))[0].color_variants_enabled,true);
      await assert.rejects(save(existing.id,[]),/permission denied/);
      await db.exec('reset role; set role service_role');
      await assert.rejects(order([{product_id:existing.id,quantity:1}]),/Choisissez une couleur/);
    });
    await t.test('color metadata edits preserve existing backorder quantities and reservations', async () => {
      await db.exec('reset role; set role authenticated');
      await q("select set_config('request.jwt.claim.sub',$1,false)",[user]);
      await q('update products set allow_backorder=true where id=$1',[existing.id]);
      await q('update inventory set quantity=-2,reserved_quantity=1 where variant_id=$1',[white.id]);
      await save(existing.id,[{...variant('WHITE','Blanc'),id:white.id,stock:null,expected_stock:-2,price:55}]);
      const [stock] = await q('select quantity,reserved_quantity from inventory where variant_id=$1',[white.id]);
      assert.deepEqual(stock,{quantity:-2,reserved_quantity:1});
    });
  } finally { await db.close(); }
});
