import { Outlet, NavLink } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const NAV = [
  { to: "/", label: "Explore", end: true },
  { to: "/about", label: "About", end: false },
] as const;

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line-soft">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">
              Tree of Life
            </span>
            <span className="hidden text-[12px] text-muted md:inline">
              the shape of the genome gap
            </span>
          </div>
          <nav className="flex items-center gap-5 text-[13px]">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `border-b-2 pb-0.5 font-medium transition-colors ${
                    isActive ? "border-glow text-ink" : "border-transparent text-muted hover:text-ink"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <a
              href="https://demo-reviverestore-genomegap.knowledgefutures.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted transition-colors hover:text-glow"
            >
              Search view
              <ArrowUpRight size={13} />
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto max-w-[1320px] px-6 py-4 text-[12px] text-faint">
          IUCN Red List status · NCBI genome assemblies · reconciled through the GBIF backbone —
          as versioned collections on the Underlay.
        </div>
      </footer>
    </div>
  );
}
