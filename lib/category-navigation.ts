import type { CategoryRow } from './database.types';

export type CategoryMenuNode = {
  id:string; name:string; href:string; label:string; column:number; icon:string|null;
  top:boolean; all:boolean; mobile:boolean; children:CategoryMenuNode[];
};
export type CategoryNavigation = {top:CategoryMenuNode[];all:CategoryMenuNode[];mobile:CategoryMenuNode[]};

/** Build URLs before filtering; hiding an ancestor never promotes its descendants. */
export function categoryNavigation(rows:CategoryRow[]):CategoryNavigation {
  const sorted=[...rows].sort((a,b)=>a.sort_order-b.sort_order || a.name.localeCompare(b.name,'fr') || a.id.localeCompare(b.id));
  const children=new Map<string|null,CategoryRow[]>();
  for(const row of sorted) children.set(row.parent_id,[...(children.get(row.parent_id)??[]),row]);
  const build=(parent:string|null,path:string[],ancestors:Set<string>):CategoryMenuNode[]=>(children.get(parent)??[]).flatMap(row=>{
    if(ancestors.has(row.id) || !row.is_active || !row.show_in_navigation) return [];
    const parts=[...path,row.slug];
    return [{id:row.id,name:row.name,label:row.navigation_label || row.name,href:`/categorie/${parts.join('/')}`,column:row.navigation_column??1,icon:row.icon,top:row.show_in_top_navigation??false,all:row.show_in_all_categories??true,mobile:row.show_in_mobile_menu??true,children:build(row.id,parts,new Set([...ancestors,row.id]))}];
  });
  // Orphans/cycles cannot enter the tree. Path generation always uses real parents.
  const tree=build(null,[],new Set());
  const filter=(nodes:CategoryMenuNode[],channel:'all'|'mobile'):CategoryMenuNode[]=>nodes.filter(node=>node[channel]).map(node=>({...node,children:filter(node.children,channel)}));
  const top:CategoryMenuNode[]=[];
  const visit=(nodes:CategoryMenuNode[])=>nodes.forEach(node=>{if(node.top) top.push(node);visit(node.children);});
  visit(tree);
  return {top,all:filter(tree,'all'),mobile:filter(tree,'mobile')};
}

/** Keep the saved desktop grouping without ever overriding sibling display order. */
export function categoryMenuColumns(nodes:CategoryMenuNode[]):CategoryMenuNode[][] {
  const groups:CategoryMenuNode[][]=[];
  for(const node of nodes) {
    const last=groups.at(-1);
    if(last?.[0].column===node.column) last.push(node); else groups.push([node]);
  }
  if(groups.length<=3) return groups;
  const size=Math.ceil(nodes.length/3);
  return [nodes.slice(0,size),nodes.slice(size,size*2),nodes.slice(size*2)].filter(group=>group.length);
}

export function categoryDescendants(rows:Pick<CategoryRow,'id'|'parent_id'>[],id:string):Set<string> {
  const found=new Set([id]);
  const visit=(parent:string)=>rows.filter(row=>row.parent_id===parent&&!found.has(row.id)).forEach(row=>{found.add(row.id);visit(row.id);});
  visit(id);
  return found;
}
