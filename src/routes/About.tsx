import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Meta } from "~/lib/types";
import { loadMeta } from "~/lib/data";
import { fmtInt, fmtPct } from "~/lib/format";

export function AboutPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  useEffect(() => {
    loadMeta().then(setMeta);
  }, []);

  const underlay = meta?.underlayUrl ?? "https://dev.underlay.org";

  return (
    <div className="mx-auto max-w-[720px] space-y-8 py-4">
      <h1 className="font-display text-[30px] font-semibold leading-tight text-ink">
        The genome gap, as a shape.
      </h1>
      {meta && (
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Every arc is a branch of the vertebrate tree — sized by how many species it holds and
          coloured by how many have a reference genome. Bright branches are well sequenced; the
          dark ones are the gap. Across{" "}
          <strong className="text-ink">{fmtInt(meta.totals.species)}</strong> assessed vertebrate
          species in <strong className="text-ink">{fmtInt(meta.totals.classes)}</strong> classes,{" "}
          <strong className="text-ink">{fmtInt(meta.totals.orders)}</strong> orders and{" "}
          <strong className="text-ink">{fmtInt(meta.totals.families)}</strong> families, just{" "}
          <strong className="text-glow">{fmtPct(meta.totals.withGenome, meta.totals.species)}</strong>{" "}
          have been sequenced.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-[18px] font-semibold text-ink">How to read it</h2>
        <ul className="space-y-2 text-[14px] leading-relaxed text-ink-soft">
          <li>Rings go from broad to fine: class → order → family, out from the centre.</li>
          <li>Arc size is the number of assessed species in that clade.</li>
          <li>Colour is the share with a reference genome — dark is the gap, aqua is sequenced.</li>
          <li>Click any wedge to dive in; click the centre to zoom back out; click a family to list its species.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[18px] font-semibold text-ink">Open, versioned data</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Everything here is assembled from three open collections — IUCN Red List status, NCBI
          genome assemblies, and the GBIF taxonomic backbone that reconciles them — each
          published as a versioned, content-addressed dataset on the Underlay. The coverage
          picture updates whenever those collections do.
        </p>
      </section>

      {meta && (
        <section className="space-y-3">
          <h2 className="font-display text-[18px] font-semibold text-ink">Data sources</h2>
          <div className="overflow-hidden rounded-xl border border-line-soft">
            {Object.values(meta.sources).map((src) => (
              <a
                key={src.collection}
                href={`${underlay}/${src.collection}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between border-b border-line-soft px-4 py-2.5 text-[13px] last:border-b-0 hover:bg-panel"
              >
                <span className="font-mono text-glow">{src.collection}</span>
                <span className="flex items-center gap-2 text-muted">
                  {src.version}
                  <ExternalLink size={13} />
                </span>
              </a>
            ))}
          </div>
          <p className="text-[12px] text-faint">
            Built{" "}
            {new Date(meta.generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            . Conservation status originates with the{" "}
            <a
              href="https://www.iucnredlist.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-line underline-offset-2 hover:text-ink"
            >
              IUCN Red List
            </a>
            .
          </p>
        </section>
      )}
    </div>
  );
}
