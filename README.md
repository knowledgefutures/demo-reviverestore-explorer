# Tree of Life — the shape of the genome gap

An interactive tree of life that shows, clade by clade, how much of the vertebrate
tree has a reference genome — and how much of the gap remains. Site B of the
Revive & Restore genome-gap demos: the exploratory, visual companion to the
analytical [`reviverestore-genomegap`](https://demo-reviverestore-genomegap.knowledgefutures.org)
search. Both are built on the same three Underlay collections.

## What it shows

- A **zoomable sunburst** of the vertebrate tree (class → order → family). Each
  arc is sized by species count and coloured by the share with a reference
  genome — bright aqua is sequenced, dark is the gap.
- Click a wedge to dive into a clade, the centre to zoom back out, a family to
  list its species. Hover anything to inspect it.
- A side panel with the focused clade's coverage, species / sequenced / gap /
  threatened counts, and a per-child coverage breakdown.
- Deep-linkable: `/?clade=Mammalia` opens focused on a clade.

## Data

Built at deploy time from three versioned, content-addressed Underlay collections,
reconciled through the GBIF taxonomic backbone:

| Collection | Role |
| --- | --- |
| `reviverestore/iucn-species` | conservation status + taxonomy (IUCN Red List, via GBIF) |
| `reviverestore/ncbi-assemblies` | genome assembly metadata (NCBI Datasets) |
| `reviverestore/gbif-backbone` | taxonomic reconciliation keys |

`scripts/build-data.ts` fetches all three, joins on the GBIF backbone key, and
writes `public/data/tree.json` (the aggregated class→order→family hierarchy that
drives the sunburst) plus `species.json` (flat rows for the family drill-in) and
`meta.json`.

## Run locally

```bash
cp .env.example .env      # set UNDERLAY_API_KEY (read-scoped dev key)
pnpm install
pnpm prebuild             # fetch + join -> public/data/
pnpm dev                  # http://localhost:5173
```

`public/data/` is gitignored; `pnpm prebuild` (and `pnpm build`) regenerate it.

## Deploy

Cloudflare Pages, connected to this repo. Build command `pnpm build`, output
directory `dist/`. Set `UNDERLAY_API_URL`, `UNDERLAY_API_KEY`, and
`VITE_UNDERLAY_URL` in the Pages environment.

Live: _demo-reviverestore-explorer.knowledgefutures.org_ (pending Pages setup).

## Stack

Vite + React 19 + Tailwind 4 + TypeScript, per the KF demo conventions. The
sunburst is `d3-hierarchy` (partition) + `d3-shape` (arc) with a `requestAnimationFrame`
tween on zoom; colour interpolation via `d3-scale` / `d3-interpolate`.
