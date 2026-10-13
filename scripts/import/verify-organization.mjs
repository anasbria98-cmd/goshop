import fs from 'node:fs/promises';import dns from 'node:dns';import {Agent,setGlobalDispatcher} from 'undici';import {createClient} from '@supabase/supabase-js';
dns.setDefaultResultOrder('ipv4first');setGlobalDispatcher(new Agent({allowH2:true,connect:{timeout:30000}}));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const check=async r=>{const x=await r;if(x.error)throw new Error(x.error.message);return x.data;};
const before=JSON.parse(await fs.readFile('/tmp/goshop-before-organization.json','utf8'));
const after=Object.fromEntries(await Promise.all(Object.keys(before).map(async t=>[t,await check(db.from(t).select('*'))])));
const unchanged=['products','inventory','brands','categories','product_images','product_attribute_values'];
for(const table of unchanged){if(after[table].length!==before[table].length)throw new Error('Count changed '+table);for(const row of before[table]){const current=after[table].find(p=>row.id ? p.id===row.id : p.product_id===row.product_id&&p.attribute_id===row.attribute_id);if(JSON.stringify(row)!==JSON.stringify(current))throw new Error('Record changed '+table+' '+row.id);}}
for(const row of before.product_categories)if(!after.product_categories.some(a=>a.product_id===row.product_id&&a.category_id===row.category_id))throw new Error('Category assignment removed');
const plan=JSON.parse(await fs.readFile('scripts/import/reports/organization-plan.json','utf8'));
const path=c=>c.parent_id?`${path(after.categories.find(p=>p.id===c.parent_id))}/${c.slug}`:c.slug;
for(const expected of [...plan.excel,...plan.sources]){const a=after.product_categories.find(a=>a.product_id===expected.id&&a.is_primary);if(path(after.categories.find(c=>c.id===a.category_id))!==(expected.expected||expected.path))throw new Error('Category mismatch '+expected.reference);}
const source=JSON.parse(await fs.readFile('scripts/import/reports/123elec-collected.json','utf8')).products;
const sourceCounts={};for(const row of source)for(const url of row.source.categoryUrls)sourceCounts[url]=(sourceCounts[url]||0)+1;
const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const pub=await check(anon.from('products').select('id'));if(pub.length!==after.products.length)throw new Error('Existing products hidden');
const report={timestamp:new Date().toISOString(),existingProductsPreserved:after.products.length,publicProducts:pub.length,excelRows:plan.excel.length,excelNew:0,excelAlreadyPresent:plan.excel.length,sourceNew:0,sourceAlreadyPresent:plan.sources.length,sourceCounts,categoriesCreated:0,categoriesRenamed:0,categoryAssignmentUpdates:['GS1008 → Photovoltaïque / Panneaux solaires (existing root relationship retained)'],brandsCreated:0,brandsReused:after.brands.map(b=>b.name),imagesPreserved:after.product_images.length,newImageFailures:0,missingSourceImages:['EZ9P32610: no image supplied','EZ9P32616: no image supplied','DS-QAE0206G1-V: image cell is text'],inventoryUnchanged:true,productFieldsUnchanged:true,categoryAssignmentsPreserved:true,finalProducts:after.products.length};
await fs.writeFile('scripts/import/reports/organization-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
