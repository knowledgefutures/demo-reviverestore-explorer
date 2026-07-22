import { scaleLinear } from "d3-scale";
import { interpolateHcl } from "d3-interpolate";

/** Coverage → colour: gap (dark, desaturated) through to sequenced (luminous aqua). */
const coverageScale = scaleLinear<string>()
  .domain([0, 0.5, 1])
  .range(["#35473f", "#2f8f78", "#7cf0c4"])
  .interpolate(interpolateHcl)
  .clamp(true);

export function coverageColor(ratio: number): string {
  return coverageScale(ratio);
}

export const CATEGORY_LABEL: Record<string, string> = {
  EX: "Extinct",
  EW: "Extinct in the Wild",
  CR: "Critically Endangered",
  EN: "Endangered",
  VU: "Vulnerable",
  NT: "Near Threatened",
  DD: "Data Deficient",
  LC: "Least Concern",
  NE: "Not Evaluated",
};

export const CATEGORY_COLOR: Record<string, string> = {
  EX: "var(--color-ex)",
  EW: "var(--color-ew)",
  CR: "var(--color-cr)",
  EN: "var(--color-en)",
  VU: "var(--color-vu)",
  NT: "var(--color-nt)",
  DD: "var(--color-dd)",
  LC: "var(--color-lc)",
  NE: "var(--color-ne)",
};

export const RANK_LABEL: Record<string, string> = {
  root: "vertebrates",
  class: "class",
  order: "order",
  family: "family",
};

export function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export function fmtPct(part: number, whole: number, digits = 1): string {
  return `${pct(part, whole).toFixed(digits)}%`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}
