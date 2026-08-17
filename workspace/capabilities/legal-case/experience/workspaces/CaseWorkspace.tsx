"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { CaseAggregate, CasePriority, CaseStatus } from "../../implementation/contracts/index.js";
import { CaseCard } from "../components/CaseCard.js";

type StatusFilter = CaseStatus | "all";
type PriorityFilter = CasePriority | "all";
interface SearchCasesOutput {
  items: CaseAggregate[];
  total: number;
  matched: number;
  offset: number;
  limit: number;
}

export function CaseWorkspace() {
  const [cases, setCases] = useState<CaseAggregate[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [query, setQuery] = useState("");

  // Fetch cases from canonical API endpoint (maintains tenant/workspace isolation)
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const resp = await fetch("/api/capabilities/lawyershub/case.search");
        if (resp.ok) {
          const data: SearchCasesOutput = await resp.json();
          setCases(data.items || []);
          setTotalCases(data.total || 0);
        } else {
          setCases([]);
          setTotalCases(0);
        }
      } catch (err) {
        console.error("[CaseWorkspace] Failed to fetch cases:", err);
        setCases([]);
        setTotalCases(0);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchCases();

    // Listen for cases:refresh event to refetch after new case creation
    const handleRefresh = () => {
      setLoading(true);
      fetchCases();
    };

    window.addEventListener('cases:refresh', handleRefresh);
    return () => window.removeEventListener('cases:refresh', handleRefresh);
  }, []);

  // Client-side filtering (matching capability layer logic)
  const result = useMemo(() => {
    let filtered = cases ? [...cases] : [];
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (priorityFilter !== "all") {
      filtered = filtered.filter(c => c.priority === priorityFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(q) || 
        (c.description?.toLowerCase() || "").includes(q)
      );
    }

    return {
      items: filtered,
      matched: filtered.length,
      total: totalCases,
      offset: 0,
      limit: 50
    };
  }, [cases, query, statusFilter, priorityFilter]);

  const filtered: readonly CaseAggregate[] = result.items;
  const allCount = result.total;

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

      {loading ? (
        <div className="p-6 text-center text-sm opacity-60 border rounded">
          Loading cases...
        </div>
      ) : filtered.length === 0 ? (
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