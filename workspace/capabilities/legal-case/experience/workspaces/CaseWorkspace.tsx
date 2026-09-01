"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { CaseAggregate, CasePriority, CaseStatus } from "../../contracts/index";
import { CaseCard } from "../components/CaseCard";

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [query, setQuery] = useState("");

  // Fetch cases from canonical API endpoint (maintains tenant/workspace isolation)
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const resp = await fetch("/api/cases/list");
        if (!resp.ok) {
          throw new Error(`Failed to fetch cases: HTTP ${resp.status}`);
        }
        const data = await resp.json();
        setCases(data.cases || []);
        setTotalCases(data.total || 0);
        setFetchError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Gagal memuat daftar kasus. Silakan coba lagi nanti.";
        console.error("[CaseWorkspace] Failed to fetch cases:", err);
        setCases([]);
        setTotalCases(0);
        setFetchError(errorMessage);
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
        <div className="p-12 text-center border rounded flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="text-lg font-medium text-text-primary">Memuat daftar kasus...</p>
        </div>
      ) : fetchError ? (
        <div className="p-12 text-center border border-red-200 bg-red-50 rounded flex flex-col items-center gap-4">
          <div className="text-6xl" aria-hidden="true">⚠️</div>
          <h3 className="text-xl font-bold text-red-800">Gagal memuat kasus</h3>
          <p className="text-red-700 max-w-md">{fetchError}</p>
          <button 
            onClick={() => { setLoading(true); setFetchError(null); window.location.reload(); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      ) : allCount === 0 ? (
        <div className="p-12 text-center border border-dashed rounded flex flex-col items-center gap-4">
          <div className="text-6xl" aria-hidden="true">📭</div>
          <h3 className="text-xl font-bold text-text-primary">Belum ada kasus</h3>
          <p className="text-text-secondary max-w-md">Anda belum memiliki kasus yang dibuat. Klik tombol "Buat Kasus Baru" untuk memulai pekerjaan pertama Anda.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded flex flex-col items-center gap-4">
          <div className="text-6xl" aria-hidden="true">🔍</div>
          <h3 className="text-xl font-bold text-text-primary">Tidak ada kasus yang cocok</h3>
          <p className="text-text-secondary max-w-md">Tidak ada kasus yang sesuai dengan filter pencarian Anda. Coba ubah filter atau kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <a key={c.id} href={`/cases/${encodeURIComponent(c.id)}`} className="block transition hover:opacity-90">
              <CaseCard item={c} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default CaseWorkspace;