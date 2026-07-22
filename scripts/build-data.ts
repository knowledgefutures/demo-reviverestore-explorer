/**
 * Build-time data fetch for the Tree of Life explorer.
 *
 * Reads the three reviverestore collections from the Underlay, joins them on the
 * GBIF backbone key, and writes:
 *
 *   public/data/tree.json     — class -> order -> family hierarchy with, at each
 *                               node, species count / with-genome / threatened
 *                               (drives the sunburst)
 *   public/data/species.json  — flat per-species rows (drives the clade drill-in)
 *   public/data/meta.json     — source versions + attribution
 *
 * Same three single-source collections as the Genome Gap search demo — a second
 * experience on the same substrate.
 */

import { writeFileSync, mkdirSync } from "node:fs";

const API_URL = process.env.UNDERLAY_API_URL ?? "https://dev.underlay.org";
const API_KEY = process.env.UNDERLAY_API_KEY ?? "";
const OWNER = "reviverestore";
const OUT_DIR = "public/data";

const AUTH_HEADERS: Record<string, string> = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function apiFetch(url: string | URL): Promise<Response> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: AUTH_HEADERS });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : (attempt + 1) * 2000;
      console.log(`    ${res.status} — waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1})...`);
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw new Error(`Gave up after retries: ${url}`);
}

interface RawRecord {
  id: string;
  type: string;
  data: Record<string, unknown>;
  hash: string;
}

async function fetchLatest(slug: string): Promise<{ semver: string }> {
  const res = await apiFetch(`${API_URL}/api/collections/${OWNER}/${slug}/versions/latest`);
  if (!res.ok) throw new Error(`latest ${slug}: ${res.status}`);
  return (await res.json()) as { semver: string };
}

async function fetchRecords(slug: string, semver: string): Promise<RawRecord[]> {
  const out: RawRecord[] = [];
  let cursor: string | undefined;
  while (true) {
    const url = new URL(`/api/collections/${OWNER}/${slug}/versions/${semver}/records`, API_URL);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("after", cursor);
    const res = await apiFetch(url);
    if (!res.ok) throw new Error(`records ${slug}: ${res.status}`);
    const body = (await res.json()) as {
      records: RawRecord[];
      pagination: { hasMore: boolean; nextCursor: string };
    };
    out.push(...body.records);
    if (!body.pagination.hasMore) break;
    cursor = body.pagination.nextCursor;
  }
  return out;
}

async function load(slug: string): Promise<{ semver: string; records: RawRecord[] }> {
  const { semver } = await fetchLatest(slug);
  const records = await fetchRecords(slug, semver);
  console.log(`  ${OWNER}/${slug} @ ${semver}: ${records.length} records`);
  return { semver, records };
}

const ASSEMBLY_LEVEL_RANK: Record<string, number> = {
  "Complete Genome": 4,
  Chromosome: 3,
  Scaffold: 2,
  Contig: 1,
};

interface FlatSpecies {
  key: number;
  sci: string;
  common: string;
  cat: string;
  threatened: boolean;
  class: string;
  order: string;
  family: string;
  hasGenome: boolean;
  accession: string;
  level: string;
}

interface TreeNode {
  name: string;
  rank: "root" | "class" | "order" | "family";
  species: number;
  withGenome: number;
  threatened: number;
  threatenedWithGenome: number;
  children?: TreeNode[];
}

function bestAccession(assemblies: RawRecord[]): Map<number, { accession: string; level: string }> {
  const m = new Map<number, { accession: string; level: string; rank: number; refseq: boolean }>();
  for (const a of assemblies) {
    const d = a.data as Record<string, unknown>;
    const key = d.gbifKey as number | undefined;
    if (key === undefined) continue;
    const level = (d.assemblyLevel as string) ?? "Contig";
    const rank = ASSEMBLY_LEVEL_RANK[level] ?? 0;
    const refseq = Boolean(d.isRefSeq);
    const accession = (d.accession as string) ?? "";
    const cur = m.get(key);
    if (!cur || rank > cur.rank || (rank === cur.rank && refseq && !cur.refseq)) {
      m.set(key, { accession, level, rank, refseq });
    }
  }
  const out = new Map<number, { accession: string; level: string }>();
  for (const [k, v] of m) out.set(k, { accession: v.accession, level: v.level });
  return out;
}

async function main() {
  console.log(`Reading reviverestore collections from ${API_URL}...`);
  const [species, backbone, assemblies] = await Promise.all([
    load("iucn-species"),
    load("gbif-backbone"),
    load("ncbi-assemblies"),
  ]);

  const best = bestAccession(assemblies.records);
  const genusByKey = new Map<number, string>();
  for (const t of backbone.records) {
    const d = t.data as Record<string, unknown>;
    if (typeof d.nubKey === "number" && typeof d.genus === "string") genusByKey.set(d.nubKey, d.genus);
  }

  const flat: FlatSpecies[] = [];
  for (const s of species.records) {
    const d = s.data as Record<string, unknown>;
    const key = d.gbifKey as number;
    const b = best.get(key);
    flat.push({
      key,
      sci: (d.canonicalName as string) ?? (d.scientificName as string) ?? "",
      common: (d.commonName as string) ?? "",
      cat: (d.category as string) ?? "NE",
      threatened: Boolean(d.threatened),
      class: (d.class as string) ?? "Other",
      order: (d.order as string) ?? "Other",
      family: (d.family as string) ?? "Other",
      hasGenome: Boolean(d.hasGenome),
      accession: b?.accession ?? "",
      level: b?.level ?? "",
    });
  }
  flat.sort((a, b) => a.sci.localeCompare(b.sci));

  // --- Build class -> order -> family tree with aggregates ---
  const root: TreeNode = {
    name: "Vertebrates",
    rank: "root",
    species: 0,
    withGenome: 0,
    threatened: 0,
    threatenedWithGenome: 0,
    children: [],
  };
  const classMap = new Map<string, TreeNode>();
  const orderMap = new Map<string, TreeNode>();
  const familyMap = new Map<string, TreeNode>();

  const bump = (n: TreeNode, s: FlatSpecies) => {
    n.species++;
    if (s.hasGenome) n.withGenome++;
    if (s.threatened) {
      n.threatened++;
      if (s.hasGenome) n.threatenedWithGenome++;
    }
  };

  for (const s of flat) {
    const cls = s.class || "Other";
    const ord = s.order || "Other";
    const fam = s.family || "Other";
    const ck = cls;
    const ok = `${cls}|${ord}`;
    const fk = `${cls}|${ord}|${fam}`;

    let classNode = classMap.get(ck);
    if (!classNode) {
      classNode = { name: cls, rank: "class", species: 0, withGenome: 0, threatened: 0, threatenedWithGenome: 0, children: [] };
      classMap.set(ck, classNode);
      root.children!.push(classNode);
    }
    let orderNode = orderMap.get(ok);
    if (!orderNode) {
      orderNode = { name: ord, rank: "order", species: 0, withGenome: 0, threatened: 0, threatenedWithGenome: 0, children: [] };
      orderMap.set(ok, orderNode);
      classNode.children!.push(orderNode);
    }
    let familyNode = familyMap.get(fk);
    if (!familyNode) {
      familyNode = { name: fam, rank: "family", species: 0, withGenome: 0, threatened: 0, threatenedWithGenome: 0 };
      familyMap.set(fk, familyNode);
      orderNode.children!.push(familyNode);
    }

    bump(root, s);
    bump(classNode, s);
    bump(orderNode, s);
    bump(familyNode, s);
  }

  // Sort children by species count desc for a pleasing sunburst layout.
  const sortRec = (n: TreeNode) => {
    if (!n.children) return;
    n.children.sort((a, b) => b.species - a.species);
    n.children.forEach(sortRec);
  };
  sortRec(root);

  const meta = {
    generatedAt: new Date().toISOString(),
    sources: {
      iucnSpecies: { collection: `${OWNER}/iucn-species`, version: species.semver },
      gbifBackbone: { collection: `${OWNER}/gbif-backbone`, version: backbone.semver },
      ncbiAssemblies: { collection: `${OWNER}/ncbi-assemblies`, version: assemblies.semver },
    },
    underlayUrl: process.env.VITE_UNDERLAY_URL ?? API_URL,
    totals: {
      species: root.species,
      withGenome: root.withGenome,
      threatened: root.threatened,
      threatenedWithGenome: root.threatenedWithGenome,
      classes: classMap.size,
      orders: orderMap.size,
      families: familyMap.size,
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/tree.json`, JSON.stringify(root));
  writeFileSync(`${OUT_DIR}/species.json`, JSON.stringify(flat));
  writeFileSync(`${OUT_DIR}/meta.json`, JSON.stringify(meta, null, 2));

  console.log(
    `\nTree: ${classMap.size} classes, ${orderMap.size} orders, ${familyMap.size} families.`,
  );
  console.log(
    `Root: ${root.species} species, ${root.withGenome} with a genome, ${root.threatened} threatened.`,
  );
  console.log(`  tree.json, species.json, meta.json -> ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
