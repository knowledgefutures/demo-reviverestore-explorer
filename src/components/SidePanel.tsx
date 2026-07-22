import { ExternalLink } from "lucide-react";
import type { SBNode } from "./Sunburst";
import type { FlatSpecies } from "~/lib/types";
import { CATEGORY_COLOR, CATEGORY_LABEL, RANK_LABEL, coverageColor, fmtInt, fmtPct, pct } from "~/lib/format";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`font-display text-[19px] font-semibold ${accent ? "text-glow" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</div>
    </div>
  );
}

function SpeciesRow({ s }: { s: FlatSpecies }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-line-soft py-1.5 first:border-t-0">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: CATEGORY_COLOR[s.cat] ?? "var(--color-ne)" }}
          />
          <span className="truncate text-[12px] italic text-ink">{s.sci}</span>
        </div>
        {s.common && <div className="truncate pl-3 text-[11px] text-faint">{s.common}</div>}
      </div>
      {s.hasGenome ? (
        <a
          href={`https://www.ncbi.nlm.nih.gov/datasets/genome/${s.accession}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-glow hover:underline"
        >
          {s.accession}
          <ExternalLink size={10} className="opacity-60 group-hover:opacity-100" />
        </a>
      ) : (
        <span className="shrink-0 text-[11px] text-faint">no genome</span>
      )}
    </div>
  );
}

interface SidePanelProps {
  node: SBNode;
  isSelectedLeaf: boolean;
  species: FlatSpecies[] | null;
}

export function SidePanel({ node, isSelectedLeaf, species }: SidePanelProps) {
  const d = node.data;
  const coverage = pct(d.withGenome, d.species);
  const gap = d.species - d.withGenome;

  return (
    <div className="flex h-full flex-col">
      <div className="text-[11px] uppercase tracking-[0.12em] text-faint">
        {RANK_LABEL[d.rank] ?? d.rank}
      </div>
      <h2 className="font-display text-[24px] font-semibold leading-tight text-ink">{d.name}</h2>

      {/* Coverage headline */}
      <div className="mt-4 flex items-end gap-3">
        <div className="font-display text-[40px] font-bold leading-none text-glow">
          {coverage.toFixed(1)}%
        </div>
        <div className="mb-1 text-[12px] leading-tight text-muted">
          have a
          <br />
          reference genome
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line-soft">
        <div className="h-full rounded-full" style={{ width: `${coverage}%`, background: coverageColor(coverage / 100) }} />
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <Stat label="Species" value={fmtInt(d.species)} />
        <Stat label="Sequenced" value={fmtInt(d.withGenome)} accent />
        <Stat label="Genome gap" value={fmtInt(gap)} />
        <Stat label="Threatened" value={fmtInt(d.threatened)} />
      </div>
      {d.threatened > 0 && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Of {fmtInt(d.threatened)} threatened species here,{" "}
          <span className="text-ink">{fmtPct(d.threatenedWithGenome, d.threatened)}</span> have a
          genome.
        </p>
      )}

      {/* Clades within (resting state for any non-leaf) */}
      {!isSelectedLeaf && node.children && node.children.length > 0 && (
        <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-line pt-4">
          <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-faint">
            Clades within {d.name}
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {node.children.slice(0, 40).map((c) => {
              const cov = pct(c.data.withGenome, c.data.species);
              return (
                <div key={c.data.name} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-[12px] text-ink-soft">
                    {c.data.name}
                  </span>
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${cov}%`, background: coverageColor(cov / 100) }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-faint">
                    {cov.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Family drill-in */}
      {isSelectedLeaf && (
        <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-line pt-4">
          <div className="mb-2 text-[11px] uppercase tracking-[0.08em] text-faint">
            Species in {d.name}
          </div>
          {species === null ? (
            <div className="text-[12px] text-faint">Loading species…</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {species.map((s) => (
                <SpeciesRow key={s.key} s={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 border-t border-line pt-3">
        <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-faint">
          Colour = share sequenced
        </div>
        <div
          className="h-2 w-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${coverageColor(0)}, ${coverageColor(0.5)}, ${coverageColor(1)})`,
          }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-faint">
          <span>0% · the gap</span>
          <span>100% · sequenced</span>
        </div>
      </div>
    </div>
  );
}
