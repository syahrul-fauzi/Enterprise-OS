"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { ConsultationAggregate, ConsultationPriority, ConsultationStatus } from "../../implementation/contracts/consultation.contracts";
import { ConsultationCard } from "../components/ConsultationCard";
import { CreateConsultationModal } from "../components/CreateConsultationModal";

type StatusFilter = ConsultationStatus | "all";
type PriorityFilter = ConsultationPriority | "all";
interface SearchConsultationsOutput {
  items: ConsultationAggregate[];
  total: number;
  matched: number;
  offset: number;
  limit: number;
}

export function ConsultationWorkspace() {
  const [consultations, setConsultations] = useState<ConsultationAggregate[]>([]);
  const [totalConsultations, setTotalConsultations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch consultations from canonical API endpoint
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const resp = await fetch("/api/capabilities/consultation/consultation.listByWorkspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (resp.ok) {
          const data: SearchConsultationsOutput = await resp.json();
          setConsultations(data.items || []);
          setTotalConsultations(data.total || 0);
        } else {
          setConsultations([]);
          setTotalConsultations(0);
        }
      } catch (err) {
        console.error("[ConsultationWorkspace] Failed to fetch consultations:", err);
        setConsultations([]);
        setTotalConsultations(0);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchConsultations();

    // Listen for consultations:refresh event to refetch after new consultation creation
    const handleRefresh = () => {
      setLoading(true);
      fetchConsultations();
    };

    window.addEventListener('consultations:refresh', handleRefresh);
    return () => window.removeEventListener('consultations:refresh', handleRefresh);
  }, []);

  // Client-side filtering
  const result = useMemo(() => {
    let filtered = consultations ? [...consultations] : [];
    
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
        c.userNeed.toLowerCase().includes(q) ||
        (c.description?.toLowerCase() || "").includes(q)
      );
    }

    return {
      items: filtered,
      matched: filtered.length,
      total: totalConsultations,
      offset: 0,
      limit: 50
    };
  }, [consultations, query, statusFilter, priorityFilter]);

  const filtered: readonly ConsultationAggregate[] = result.items;
  const allCount = result.total;

  const statusOptions: readonly StatusFilter[] = [
    "all",
    "draft",
    "submitted",
    "triaging",
    "actionable",
    "closed",
  ] as const;
  const priorityOptions: readonly PriorityFilter[] = [
    "all",
    "low",
    "medium",
    "high",
    "critical",
  ] as const;

  const fmtOption = (s: string) => {
    const labels: Record<string, string> = {
      "all": "Semua",
      "draft": "Draft",
      "submitted": "Terkirim",
      "triaging": "Analisis",
      "actionable": "Siap Tindak",
      "closed": "Selesai",
      "low": "Rendah",
      "medium": "Sedang",
      "high": "Tinggi",
      "critical": "Kritis",
    };
    return labels[s] || s.replace("_", " ");
  };

  const handleCreateConsultation = async (data: {
    title: string;
    description: string;
    userNeed: string;
    priority: ConsultationPriority;
  }) => {
    // First create the consultation
    const createResp = await fetch("/api/capabilities/consultation/consultation.create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!createResp.ok) {
      throw new Error("Failed to create consultation");
    }

    const createResult = await createResp.json();
    
    // Then automatically triage it to trigger the intent detection and case creation
    const triageResp = await fetch("/api/capabilities/consultation/consultation.triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: createResult.output.id,
        triageResult: "auto",
      }),
    });

    if (!triageResp.ok) {
      console.warn("Consultation created but triage failed, might need manual review");
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold">Konsultasi</h2>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('consultations:create'))}
          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          data-testid="create-consultation-button"
        >
          + Mulai Konsultasi Baru
        </button>
        <div className="flex items-center gap-2 text-sm opacity-70">
          <span>
            menampilkan {filtered.length} dari {allCount}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          aria-label="Cari konsultasi"
          className="px-3 py-1.5 border rounded text-sm w-full sm:max-w-xs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari konsultasi..."
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

      {/* Create Consultation Modal */}
      <CreateConsultationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateConsultation}
      />

      {loading ? (
        <div className="p-6 text-center text-sm opacity-60 border rounded">
          Memuat konsultasi...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-center text-sm opacity-60 border border-dashed rounded">
          Belum ada konsultasi. Mulai konsultasi baru untuk mendeskripsikan kebutuhan Anda.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <ConsultationCard key={c.id} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ConsultationWorkspace;