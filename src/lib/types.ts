export interface TreeNode {
  name: string;
  rank: "root" | "class" | "order" | "family";
  species: number;
  withGenome: number;
  threatened: number;
  threatenedWithGenome: number;
  children?: TreeNode[];
}

export interface FlatSpecies {
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

export interface Meta {
  generatedAt: string;
  sources: Record<string, { collection: string; version: string }>;
  underlayUrl: string;
  totals: {
    species: number;
    withGenome: number;
    threatened: number;
    threatenedWithGenome: number;
    classes: number;
    orders: number;
    families: number;
  };
}
