import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryNavigation,categoryDescendants,categoryMenuColumns} from '../lib/category-navigation.ts';
const row=(id,parent_id=null,patch={})=>({id,parent_id,name:id,slug:id,sort_order:0,is_active:true,show_in_navigation:true,show_in_top_navigation:false,show_in_all_categories:true,show_in_mobile_menu:true,navigation_label:null,navigation_column:1,icon:null,...patch});
test('One database hierarchy drives desktop/mobile names, order and nested URLs',()=>{
 const rows=[row('root',null,{show_in_top_navigation:true}),row('b','root',{sort_order:2}),row('a','root',{sort_order:1}),row('leaf','a')];
 const nav=categoryNavigation(rows);
 assert.deepEqual(nav.top[0].children.map(x=>x.id),['a','b']);
 assert.deepEqual(nav.all,nav.mobile);
 assert.equal(nav.mobile[0].children[0].children[0].href,'/categorie/root/a/leaf');
 const reordered=categoryNavigation(rows.map(r=>r.id==='b'?{...r,sort_order:-1}:r));
 assert.deepEqual(reordered.mobile[0].children.map(x=>x.id),['b','a']);
 assert.deepEqual(reordered.top[0].children.map(x=>x.id),['b','a']);
 assert.equal(rows[1].sort_order,2);
});
test('Independent channel visibility, master hidden branches, inactive parents, cycles and orphans',()=>{
 const rows=[row('root',null,{show_in_top_navigation:true,show_in_all_categories:false}),row('child','root'),row('hidden',null,{show_in_navigation:false}),row('desc','hidden'),row('inactive',null,{is_active:false}),row('desc2','inactive'),row('mobile-hidden',null,{show_in_mobile_menu:false}),row('orphan','missing'),row('cycle','cycle')];
 const nav=categoryNavigation(rows);
 assert.deepEqual(nav.top.map(x=>x.id),['root']);
 assert.deepEqual(nav.all.map(x=>x.id),['mobile-hidden']);
 assert.deepEqual(nav.mobile.map(x=>x.id),['root']);
 assert.equal(nav.mobile[0].children[0].name,'child');
});
test('Reparenting changes the shared URL and descendants cannot be selected as parents',()=>{
 const rows=[row('a'),row('b'),row('child','a'),row('leaf','child')];
 assert.deepEqual([...categoryDescendants(rows,'a')],['a','child','leaf']);
 const nav=categoryNavigation(rows.map(r=>r.id==='child'?{...r,parent_id:'b'}:r));
 assert.equal(nav.mobile[1].children[0].children[0].href,'/categorie/b/child/leaf');
});
test('Desktop columns never reorder siblings, including after an admin reorder crosses columns',()=>{
 const nodes=categoryNavigation([row('root'),...Array.from({length:8},(_,i)=>row(`n${i}`,'root',{sort_order:i,navigation_column:i%3+1}))]).all[0].children;
 assert.deepEqual(categoryMenuColumns(nodes).flat(),nodes);
 assert.ok(categoryMenuColumns(nodes).length<=3);
});
