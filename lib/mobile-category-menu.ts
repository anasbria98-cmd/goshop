import type { CatalogCategory } from './catalog-model';

export type MobileCategoryNode = {id:string;name:string;href:string;children:MobileCategoryNode[]};

/** Preserve database order and parent IDs; never invent or promote missing parents. */
export function mobileCategoryTree(categories: Pick<CatalogCategory,'id'|'name'|'path'|'parentId'>[]): MobileCategoryNode[] {
  const nodes = new Map(categories.map(category=>[category.id,{id:category.id,name:category.name,href:`/categorie/${category.path}`,children:[] as MobileCategoryNode[]} ]));
  const roots: MobileCategoryNode[] = [];
  for (const category of categories) {
    const node = nodes.get(category.id)!;
    if (category.parentId === null) roots.push(node);
    else if (category.parentId !== category.id) nodes.get(category.parentId)?.children.push(node);
  }
  return roots;
}

export function toggleMobileCategory(open: ReadonlySet<string>, node: MobileCategoryNode): Set<string> {
  const next = new Set(open);
  if (!next.has(node.id)) next.add(node.id);
  else {
    const close = (branch: MobileCategoryNode) => {next.delete(branch.id);branch.children.forEach(close);};
    close(node);
  }
  return next;
}
