import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { arc } from "d3-shape";
import type { HierarchyRectangularNode } from "d3-hierarchy";
import type { TreeNode } from "~/lib/types";
import { coverageColor, pct } from "~/lib/format";

export type SBNode = HierarchyRectangularNode<TreeNode>;

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const SIZE = 840;
const RINGS = 3; // rings of arcs shown beyond the centre
const RING = SIZE / 2 / (RINGS + 1);
const DURATION = 720;

const arcGen = arc<Rect>()
  .startAngle((d) => d.x0)
  .endAngle((d) => d.x1)
  .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
  .padRadius(RING * 1.5)
  .innerRadius((d) => d.y0 * RING)
  .outerRadius((d) => Math.max(d.y0 * RING, d.y1 * RING - 1.5));

function toRect(d: SBNode, focus: SBNode): Rect {
  const span = focus.x1 - focus.x0 || 1;
  return {
    x0: Math.max(0, Math.min(1, (d.x0 - focus.x0) / span)) * 2 * Math.PI,
    x1: Math.max(0, Math.min(1, (d.x1 - focus.x0) / span)) * 2 * Math.PI,
    y0: Math.max(0, d.y0 - focus.depth),
    y1: Math.max(0, d.y1 - focus.depth),
  };
}

const arcVisible = (r: Rect) => r.y1 <= RINGS + 1 && r.y0 >= 1 && r.x1 > r.x0;
const labelVisible = (r: Rect) =>
  r.y0 >= 1 && r.y1 <= 3 && (r.x1 - r.x0) * (r.y0 + r.y1) > 0.6;

function labelTransform(r: Rect): string {
  const angle = (((r.x0 + r.x1) / 2) * 180) / Math.PI;
  const radius = ((r.y0 + r.y1) / 2) * RING;
  return `rotate(${angle - 90}) translate(${radius},0) rotate(${angle < 180 ? 0 : 180})`;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface SunburstProps {
  root: SBNode;
  focus: SBNode;
  onFocus: (n: SBNode) => void;
  onSelectLeaf: (n: SBNode) => void;
  onHover: (n: SBNode | null) => void;
  hovered: SBNode | null;
}

export function Sunburst({ root, focus, onFocus, onSelectLeaf, onHover, hovered }: SunburstProps) {
  const nodes = useMemo(() => root.descendants(), [root]);
  const posRef = useRef<Rect[]>(nodes.map((n) => toRect(n, root)));
  const rafRef = useRef<number>(0);
  const [, setTick] = useState(0);

  // Re-seed positions if the tree itself changes.
  useLayoutEffect(() => {
    posRef.current = nodes.map((n) => toRect(n, focus));
    setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Animate to the new focus.
  useEffect(() => {
    const start = posRef.current.map((r) => ({ ...r }));
    const target = nodes.map((n) => toRect(n, focus));
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const e = easeInOut(Math.min(1, (now - t0) / DURATION));
      posRef.current = target.map((tg, i) => {
        const s = start[i]!;
        return {
          x0: lerp(s.x0, tg.x0, e),
          x1: lerp(s.x1, tg.x1, e),
          y0: lerp(s.y0, tg.y0, e),
          y1: lerp(s.y1, tg.y1, e),
        };
      });
      setTick((t) => t + 1);
      if (e < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const pos = posRef.current;

  return (
    <svg
      viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
      className="h-full w-full max-h-[78vh] select-none"
      onMouseLeave={() => onHover(null)}
    >
      <g>
        {nodes.map((n, i) => {
          const r = pos[i]!;
          if (!arcVisible(r)) return null;
          const cover = pct(n.data.withGenome, n.data.species) / 100;
          const isHover = hovered === n;
          const d = arcGen(r) ?? undefined;
          return (
            <path
              key={i}
              d={d}
              fill={coverageColor(cover)}
              stroke="#0d1e19"
              strokeWidth={0.75}
              opacity={hovered && !isHover ? 0.82 : 1}
              style={{ cursor: n.children ? "pointer" : "default" }}
              onMouseEnter={() => onHover(n)}
              onClick={(e) => {
                e.stopPropagation();
                if (n.children) onFocus(n);
                else onSelectLeaf(n);
              }}
            >
              <title>
                {n.data.name} — {n.data.withGenome}/{n.data.species} sequenced
              </title>
            </path>
          );
        })}
      </g>

      {/* Labels for the larger arcs */}
      <g pointerEvents="none" className="font-sans">
        {nodes.map((n, i) => {
          const r = pos[i]!;
          if (!arcVisible(r) || !labelVisible(r)) return null;
          return (
            <text
              key={i}
              transform={labelTransform(r)}
              textAnchor="middle"
              dy="0.32em"
              fill="#eaf3ee"
              fontSize={r.y0 < 2 ? 11 : 9}
              fontWeight={r.y0 < 2 ? 600 : 400}
              opacity={0.9}
              style={{ paintOrder: "stroke", stroke: "#0d1e19", strokeWidth: 2.5 }}
            >
              {n.data.name}
            </text>
          );
        })}
      </g>

      {/* Centre — click to zoom out */}
      <circle
        r={RING - 1}
        fill="#0f221c"
        stroke="#244a3d"
        strokeWidth={1}
        style={{ cursor: focus.parent ? "pointer" : "default" }}
        onClick={(e) => {
          e.stopPropagation();
          if (focus.parent) onFocus(focus.parent);
        }}
      />
      <g pointerEvents="none" textAnchor="middle" className="font-display">
        <text y={-14} fill="#eaf3ee" fontSize={16} fontWeight={600}>
          {focus.data.name}
        </text>
        <text y={10} fill="#7cf0c4" fontSize={22} fontWeight={700}>
          {pct(focus.data.withGenome, focus.data.species).toFixed(1)}%
        </text>
        <text y={28} fill="#7f958c" fontSize={10.5} className="font-sans">
          sequenced
        </text>
        {focus.parent && (
          <text y={48} fill="#5b7068" fontSize={9.5} className="font-sans">
            click to zoom out
          </text>
        )}
      </g>
    </svg>
  );
}
