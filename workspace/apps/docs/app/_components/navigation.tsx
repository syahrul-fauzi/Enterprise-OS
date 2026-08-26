"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EOS_KNOWLEDGE_MODEL, STATUS } from "../_lib/eos-knowledge-model";
import { StatusBadge } from "./status-badge";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/architecture", label: "Architecture" },
  { href: "/capabilities", label: "Capabilities" },
  { href: "/procedures", label: "Procedures" },
  { href: "/surfaces", label: "Surfaces" },
  { href: "/state", label: "State" },
  { href: "/evidence", label: "Evidence" },
  { href: "/gates", label: "Gates" },
] as const;

export function KnowNavigation() {
  const pathname = usePathname();
  const mode = EOS_KNOWLEDGE_MODEL.state.currentMode;
  const scope = EOS_KNOWLEDGE_MODEL.state.scope;

  return (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-bold shrink-0"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          EOS · KNOW
          <StatusBadge status={STATUS.IMPLEMENTING} />
        </Link>

        <div className="flex-1 overflow-x-auto">
          <ul className="flex items-center gap-1 min-w-max">
            {NAV.map((n) => {
              const isActive =
                n.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(n.href) ?? false;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-neutral-800 text-white border border-neutral-700"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-mono shrink-0">
          <span className="px-2 py-1 rounded border border-purple-900 bg-purple-950/40 text-purple-300">
            🛡️ {mode}
          </span>
          <span className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900 text-neutral-400">
            scope: {scope}
          </span>
        </div>
      </div>
    </nav>
  );
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  updatedAt = EOS_KNOWLEDGE_MODEL.identity.lastUpdated,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  updatedAt?: string;
}) {
  return (
    <header className="mb-10 pt-8">
      {kicker ? (
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-400 mb-2">
          {kicker}
        </p>
      ) : null}
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h1>
      {subtitle ? <p className="text-neutral-400 mb-3">{subtitle}</p> : null}
      <p className="text-xs font-mono text-neutral-600">
        EOS V1 · last updated {updatedAt}
      </p>
    </header>
  );
}