import { useEffect, useMemo, useState } from "react";
import { hierarchy, partition } from "d3-hierarchy";
import { ChevronRight } from "lucide-react";
import type { TreeNode, FlatSpecies } from "~/lib/types";
import { loadTree, loadSpecies } from "~/lib/data";
import { Sunburst, type SBNode } from "~/components/Sunburst";
import { SidePanel } from "~/components/SidePanel";

function buildRoot(tree: TreeNode): SBNode {
  const h = hierarchy<TreeNode>(tree)
    .sum((d) => (d.children && d.children.length ? 0 : d.species))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return partition<TreeNode>().size([2 * Math.PI, (h.height || 1) + 1])(h) as SBNode;
}

export function ExplorePage() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [focus, setFocus] = useState<SBNode | null>(null);
  const [hovered, setHovered] = useState<SBNode | null>(null);
  const [selectedLeaf, setSelectedLeaf] = useState<SBNode | null>(null);
  const [leafSpecies, setLeafSpecies] = useState<FlatSpecies[] | null>(null);

  useEffect(() => {
    loadTree().then(setTree);
  }, []);

  const root = useMemo(() => (tree ? buildRoot(tree) : null), [tree]);

  useEffect(() => {
    if (root && !focus) {
      // Deep link: /?clade=<name> opens focused on that clade.
      const wanted = new URLSearchParams(window.location.search).get("clade");
      const match = wanted ? root.descendants().find((n) => n.data.name === wanted) : undefined;
      setFocus(match ?? root);
    }
  }, [root, focus]);

  const changeFocus = (n: SBNode) => {
    setFocus(n);
    setSelectedLeaf(null);
    setHovered(null);
  };

  const selectLeaf = (n: SBNode) => {
    setSelectedLeaf(n);
    setLeafSpecies(null);
    const family = n.data.name;
    const order = n.parent?.data.name;
    const cls = n.parent?.parent?.data.name;
    loadSpecies().then((all) => {
      setLeafSpecies(
        all
          .filter((s) => s.family === family && s.order === order && s.class === cls)
          .sort((a, b) => Number(b.hasGenome) - Number(a.hasGenome) || a.sci.localeCompare(b.sci)),
      );
    });
  };

  if (!root || !focus) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        Growing the tree of life…
      </div>
    );
  }

  const active = hovered ?? selectedLeaf ?? focus;
  const crumbs = focus.ancestors().reverse();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1 text-[13px]">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} className="text-faint" />}
              <button
                onClick={() => changeFocus(c)}
                className={
                  c === focus
                    ? "font-medium text-ink"
                    : "text-muted transition-colors hover:text-glow"
                }
              >
                {c.data.name}
              </button>
            </span>
          ))}
        </div>

        <div className="mt-2 flex justify-center">
          <Sunburst
            root={root}
            focus={focus}
            onFocus={changeFocus}
            onSelectLeaf={selectLeaf}
            onHover={setHovered}
            hovered={hovered}
          />
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:h-[80vh]">
        <div className="h-full rounded-2xl border border-line-soft bg-panel/60 p-6 backdrop-blur-sm">
          <SidePanel
            node={active}
            isSelectedLeaf={active === selectedLeaf && selectedLeaf !== null}
            species={leafSpecies}
          />
        </div>
      </div>
    </div>
  );
}
