"use client";

import React, { useMemo, useState } from "react";
import { caseService } from "../../implementation/service";
import type { CaseAggregate, CasePriority, CaseStatus } from "../../implementation/contracts";
import { CaseCard } from "../components/CaseCard";

type StatusFilter = CaseStatus | "all";
type PriorityFilter = CasePriority | "all";

export function CaseWorkspace() {
  const initial = useMemo(
    () => caseService.searchCases({ limit: 50, offset: 0 }),
    []
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [query, setQuery] = useState("");

  const result = useMemo(() => {
    return caseService.searchCases({
      query,
      status: statusFilter,
      priority: priorityFilter,
      limit: 50,
      offset: 0,
    });
  }, [query, statusFilter, priorityFilter]);

  const filtered: readonly CaseAggregate[] = result.items;
  const allCount = initial.total;

  const statusOptions: readonly StatusFilter[] = [
    "all",
    "draft",
    "open",
    "in_progress",
    "closed",
  ] as const;
  const priorityOptions: readonly PriorityFilter[] = [
    "all",
    "low",
    "medium",
    "high",
    "critical",
  ] as const;

  const fmtOption = (s: string) => s.replace("_", " ");

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold">Legal Cases</h2>
        <div className="flex items-center gap-2 text-sm opacity-70">
          <span>
            showing {filtered.length} of {allCount} (matched {result.matched})
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          aria-label="Search cases"
          className="px-3 py-1.5 border rounded text-sm w-full sm:max-w-xs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cases..."
          value={query}
        />
        <div className="flex flex-wrap gap-1">
          {statusOptions.map((s) => (
            <button
              key={s}
              className={`text-xs px-2 py-1 rounded border transition ${
                statusFilter === s
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setStatusFilter(s)}
              type="button"
            >
              {fmtOption(s)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {priorityOptions.map((s) => (
            <button
              key={s}
              className={`text-xs px-2 py-1 rounded border transition ${
                priorityFilter === s
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setPriorityFilter(s)}
              type="button"
            >
              {fmtOption(s)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-sm opacity-60 border border-dashed rounded">
          No cases match the current filters.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <CaseCard key={c.id} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CaseWorkspace;
