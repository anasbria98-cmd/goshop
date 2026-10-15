"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";
import type { CategoryRow } from "@/lib/database.types";

type CategoryNode = CategoryRow & { children: CategoryNode[] };

function buildTree(categories: CategoryRow[]) {
  const nodes = new Map(categories.map((category) => [category.id, { ...category, children: [] as CategoryNode[] }]));
  const roots: CategoryNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parent_id ? nodes.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sort = (items: CategoryNode[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

function matchingTree(nodes: CategoryNode[], query: string): CategoryNode[] {
  if (!query) return nodes;
  return nodes.flatMap((node) => {
    const children = matchingTree(node.children, query);
    return node.name.toLocaleLowerCase("fr").includes(query) || children.length
      ? [{ ...node, children }]
      : [];
  });
}

function CategoryBranch({
  node,
  depth,
  selected,
  expanded,
  forceOpen,
  onToggle,
  onSelect,
}: {
  node: CategoryNode;
  depth: number;
  selected: Set<string>;
  expanded: Set<string>;
  forceOpen: boolean;
  onToggle: (id: string, open: boolean) => void;
  onSelect: (id: string, checked: boolean) => void;
}) {
  const hasChildren = node.children.length > 0;
  const row = (
    <label className="admin-category-option" style={{ paddingLeft: 10 + depth * 18 }}>
      <input type="checkbox" checked={selected.has(node.id)} onChange={(event) => onSelect(node.id, event.target.checked)} />
      <span>{node.name}</span>
      {selected.has(node.id) ? <Check aria-hidden="true" size={14} /> : null}
    </label>
  );

  if (!hasChildren) return row;
  const open = forceOpen || expanded.has(node.id);
  return (
    <details className="admin-category-branch" open={open} onToggle={(event) => onToggle(node.id, event.currentTarget.open)}>
      <summary style={{ paddingLeft: depth * 18 }}>
        <ChevronRight aria-hidden="true" size={14} />
        <span>{node.name}</span>
        <small>{node.children.length}</small>
      </summary>
      {row}
      {node.children.map((child) => (
        <CategoryBranch
          key={child.id}
          node={child}
          depth={depth + 1}
          selected={selected}
          expanded={expanded}
          forceOpen={forceOpen}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </details>
  );
}

export function CategorySelector({
  categories,
  initialSelected = [],
  initialPrimary,
  onSelectionChange,
}: {
  categories: CategoryRow[];
  initialSelected?: string[];
  initialPrimary?: string;
  onSelectionChange?: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(initialSelected));
  const [primary, setPrimary] = useState(initialPrimary ?? initialSelected[0] ?? "");
  const [expanded, setExpanded] = useState(() => {
    const categoryMap = new Map(categories.map((item) => [item.id, item]));
    const ancestors = new Set<string>();
    initialSelected.forEach((id) => {
      let current = categoryMap.get(id);
      while (current?.parent_id) {
        ancestors.add(current.parent_id);
        current = categoryMap.get(current.parent_id);
      }
    });
    return ancestors;
  });
  const tree = useMemo(() => buildTree(categories), [categories]);
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const visibleTree = useMemo(() => matchingTree(tree, normalizedQuery), [tree, normalizedQuery]);
  const byId = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);

  const pathFor = (id: string) => {
    const path: string[] = [];
    let current = byId.get(id);
    while (current) {
      path.unshift(current.name);
      current = current.parent_id ? byId.get(current.parent_id) : undefined;
    }
    return path.join(" → ");
  };
  const selectedIds = [...selected];

  const changeSelection = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    if (checked && !primary) setPrimary(id);
    if (!checked && primary === id) setPrimary([...next][0] ?? "");
    setSelected(next);
    onSelectionChange?.([...next]);
  };

  return (
    <div className="admin-category-selector">
      {selectedIds.map((id) => <input key={id} type="hidden" name="category_id" value={id} />)}
      <input type="hidden" name="primary_category_id" value={primary} />

      <label className="admin-category-search">
        <Search aria-hidden="true" size={15} />
        <input aria-label="Rechercher une catégorie" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une catégorie" />
      </label>

      {selectedIds.length ? (
        <div className="admin-category-selected">
          <span>Catégories sélectionnées</span>
          {selectedIds.map((id) => (
            <div key={id} className={primary === id ? "is-primary" : undefined}>
              <label>
                <input type="radio" checked={primary === id} onChange={() => setPrimary(id)} />
                <span><strong>{byId.get(id)?.name}{primary === id ? <em className="admin-primary-category-badge">Principale</em> : null}</strong><small>{pathFor(id)}</small></span>
              </label>
              <button type="button" aria-label={`Retirer ${byId.get(id)?.name ?? "la catégorie"}`} onClick={() => changeSelection(id, false)}><X size={13} /></button>
            </div>
          ))}
          <small>Sélectionnez le bouton rond pour définir la catégorie principale.</small>
        </div>
      ) : <p className="admin-category-help">Choisissez une catégorie pour organiser le produit et afficher ses caractéristiques.</p>}

      <div className="admin-category-tree">
        {visibleTree.length ? visibleTree.map((node) => (
          <CategoryBranch
            key={node.id}
            node={node}
            depth={0}
            selected={selected}
            expanded={expanded}
            forceOpen={Boolean(normalizedQuery)}
            onToggle={(id, open) => setExpanded((current) => {
              const next = new Set(current);
              if (open) next.add(id);
              else next.delete(id);
              return next;
            })}
            onSelect={changeSelection}
          />
        )) : <p className="admin-category-help">Aucune catégorie ne correspond à votre recherche.</p>}
      </div>
    </div>
  );
}
