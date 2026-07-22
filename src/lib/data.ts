import type { TreeNode, FlatSpecies, Meta } from "./types";

let treeCache: TreeNode | null = null;
let metaCache: Meta | null = null;
let speciesCache: FlatSpecies[] | null = null;
let speciesPromise: Promise<FlatSpecies[]> | null = null;

export async function loadTree(): Promise<TreeNode> {
  if (treeCache) return treeCache;
  const res = await fetch("/data/tree.json");
  treeCache = (await res.json()) as TreeNode;
  return treeCache;
}

export async function loadMeta(): Promise<Meta> {
  if (metaCache) return metaCache;
  const res = await fetch("/data/meta.json");
  metaCache = (await res.json()) as Meta;
  return metaCache;
}

/** Flat species list — fetched lazily the first time a clade drill-in needs it. */
export async function loadSpecies(): Promise<FlatSpecies[]> {
  if (speciesCache) return speciesCache;
  if (!speciesPromise) {
    speciesPromise = fetch("/data/species.json")
      .then((r) => r.json() as Promise<FlatSpecies[]>)
      .then((d) => {
        speciesCache = d;
        return d;
      });
  }
  return speciesPromise;
}
