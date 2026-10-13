// Restore the six cards present immediately before the live-catalog migration.
// Historical selling prices are provisional; stock/reviews/discounts are not restored.
import fs from 'node:fs/promises';
import dns from 'node:dns';
import {execFileSync} from 'node:child_process';
import {Agent,setGlobalDispatcher} from 'undici';
import {createClient} from '@supabase/supabase-js';
dns.setDefaultResultOrder('ipv4first');setGlobalDispatcher(new Agent({allowH2:true,connect:{timeout:30000}}));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const checked=async request=>{const r=await request;if(r.error)throw new Error(r.error.message);return r.data;};
const original=execFileSync('git',['show','5ee2ed8:data/catalog.ts'],{encoding:'utf8'});
const blocks=original.split('export const products: Product[] = [')[1].split('\n];')[0].match(/\{[^}]+\}/g);
const recovered=blocks.map(block=>Object.fromEntries([...block.matchAll(/(\w+):\s*("[^"]*"|\d+(?:\.\d+)?|true)/g)].map(([,k,v])=>[k,JSON.parse(v)])));
const order=['GS1004','GS1011','GS1005','GS1006','GS1007','GS1008'];
if(recovered.length!==6)throw new Error('Unexpected historic catalog');
const categories=await checked(db.from('categories').select('*'));
const categoryPath=c=>c.parent_id?`${categoryPath(categories.find(p=>p.id===c.parent_id))}/${c.slug}`:c.slug;
const paths={GS1004:'eclairage/interieur/ampoule',GS1011:'eclairage/interieur/ampoule',GS1005:'materiel-electrique/bornes-connexion',GS1006:'cables-fils/cable-u500v',GS1007:'outillage/perceuses-visseuses',GS1008:'photovoltaique'};
// Resolve existing navigation paths rather than creating replacement categories.
for(const id of order)if(!categories.some(c=>categoryPath(c)===paths[id]))throw new Error('Category not found: '+paths[id]);
const brands=await checked(db.from('brands').select('*'));
const products=await checked(db.from('products').select('*'));
const inventories=await checked(db.from('inventory').select('*').order('product_id'));
const report={sourceCommit:'5ee2ed8',timestamp:new Date().toISOString(),note:'Client requested restoration of historic homepage cards as live product records. Historic MAD prices retained for client review. No simulated stock, reviews, sales claims or discounts. Unverified historic manufacturer references omitted.',beforeCount:products.length,rows:[]};
await fs.writeFile('scripts/import/reports/homepage-restoration.json',JSON.stringify(report,null,2));
for(const id of order){
 const row=recovered.find(r=>r.id===id);
 const slug=row.brand.toLowerCase().replace(/\s+/g,'-');
 let brand=brands.find(b=>b.name.toLowerCase()===row.brand.toLowerCase());
 if(!brand){brand=await checked(db.from('brands').insert({name:row.brand,slug,is_active:true}).select().single());brands.push(brand);}
 let p=products.find(p=>p.sku===id||p.slug===row.slug);
 if(!p){p=await checked(db.from('products').insert({name:row.name,slug:row.slug,sku:id,manufacturer_reference:id==='GS1005'?'221-413':null,brand_id:brand.id,price:row.price,description:row.name,status:'active',published_at:report.timestamp,featured:true,is_new:true,stock_tracking:true,allow_backorder:false}).select().single());products.push(p);}
 else await checked(db.from('products').update({status:'active',published_at:p.published_at||report.timestamp,featured:true,is_new:true}).eq('id',p.id));
 const bytes=await fs.readFile(`public/products/${row.image}.webp`);
 const path=`products/${p.id}/restored-homepage.webp`;
 const upload=await db.storage.from('product-images').upload(path,bytes,{contentType:'image/webp',upsert:true});if(upload.error)throw new Error(upload.error.message);
 const images=await checked(db.from('product_images').select('id').eq('product_id',p.id).eq('storage_path',path));
 if(!images.length)await checked(db.from('product_images').insert({product_id:p.id,storage_path:path,alt_text:row.name,sort_order:0,is_primary:true}));
 await checked(db.from('media_assets').upsert({bucket:'product-images',storage_path:path,file_name:`${id}.webp`,mime_type:'image/webp',size_bytes:bytes.length,alt_text:row.name},{onConflict:'bucket,storage_path'}));
 await checked(db.from('products').update({main_image_url:path}).eq('id',p.id));
 const category=categories.find(c=>categoryPath(c)===paths[id]);const assignments=[];let parent=category;
 while(parent){assignments.push({product_id:p.id,category_id:parent.id,is_primary:parent.id===category.id});parent=categories.find(c=>c.id===parent.parent_id);}
 await checked(db.from('product_categories').upsert(assignments,{onConflict:'product_id,category_id'}));
 if(!inventories.some(i=>i.product_id===p.id))await checked(db.from('inventory').insert({product_id:p.id,quantity:0,reserved_quantity:0}));
 report.rows.push({id:p.id,sku:id,name:row.name,price:p.price,path:paths[id],image:path});await fs.writeFile('scripts/import/reports/homepage-restoration.json',JSON.stringify(report,null,2));
}
const priorSelection=JSON.parse(await fs.readFile('scripts/import/reports/publication.json','utf8')).featuredIds;
await checked(db.from('products').update({featured:false}).in('id',priorSelection));
const afterInventory=await checked(db.from('inventory').select('*').order('product_id'));
if(JSON.stringify(inventories)!==JSON.stringify(afterInventory.filter(i=>inventories.some(b=>b.id===i.id))))throw new Error('Existing inventory changed');
const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const publicProducts=await checked(anon.from('products').select('id,sku,featured'));
if(report.rows.some(r=>!publicProducts.some(p=>p.id===r.id)))throw new Error('Restored record not public');
report.result={restored:report.rows.length,publicProducts:publicProducts.length,existingInventoryUnchanged:true};
await fs.writeFile('scripts/import/reports/homepage-restoration.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.result));
