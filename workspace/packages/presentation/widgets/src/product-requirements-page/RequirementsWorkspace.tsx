"use client";

import React, { useState, useEffect } from "react";
// Define local RequirementRecord type since external registry not found yet
interface RequirementRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  productId: string;
  createdAt: string;
  createdBy: string;
}

// SAMPLE_DATA - Fallback jika API belum tersedia (sesuai dengan pattern yang digunakan di DocumentWorkspace dan EvidenceWorkspace)
const SAMPLE_REQUIREMENTS: RequirementRecord[] = [
  {
    id: "req-001",
    title: "Sistem harus mendukung multi-tenant",
    description: "Setiap organisasi harus memiliki instance yang terisolasi sepenuhnya",
    status: "completed",
    priority: "high",
    productId: "lawyershub",
    createdAt: new Date("2024-01-15").toISOString(),
    createdBy: "system"
  },
  {
    id: "req-002",
    title: "Dukungan OIDC Auth",
    description: "Autentikasi harus menggunakan standar OIDC 1.0 untuk semua workspace",
    status: "completed",
    priority: "high",
    productId: "lawyershub",
    createdAt: new Date("2024-01-20").toISOString(),
    createdBy: "engineering"
  },
  {
    id: "req-003",
    title: "Export laporan audit",
    description: "Pengguna harus bisa mengekspor semua log audit ke format CSV/PDF",
    status: "in-progress",
    priority: "medium",
    productId: "lawyershub",
    createdAt: new Date("2024-02-01").toISOString(),
    createdBy: "product"
  },
  {
    id: "req-004",
    title: "Pencarian full-text pada dokumen",
    description: "Implementasi Elasticsearch untuk pencarian full-text pada semua dokumen yang diunggah",
    status: "draft",
    priority: "medium",
    productId: "lawyershub",
    createdAt: new Date("2024-02-10").toISOString(),
    createdBy: "engineering"
  },
  {
    id: "req-005",
    title: "Mobile responsive design",
    description: "Semua halaman harus mendukung tampilan mobile dengan sempurna",
    status: "in-progress",
    priority: "high",
    productId: "services-id",
    createdAt: new Date("2024-02-15").toISOString(),
    createdBy: "design"
  }
];

interface RequirementsWorkspaceProps {
  readonly productId: string;
  readonly showCreate: boolean;
  readonly onCloseCreate: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  "in-progress": "Dalam Proses",
  review: "Dalam Review",
  completed: "Selesai",
  blocked: "Terkendala"
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  critical: "Kritis"
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  blocked: "bg-red-100 text-red-700"
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  critical: "bg-red-100 text-red-600"
};

export function RequirementsWorkspace({ productId, showCreate, onCloseCreate }: RequirementsWorkspaceProps) {
  const [requirements, setRequirements] = useState<RequirementRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch requirements from API - mengikuti pattern yang sama dengan DocumentWorkspace dan EvidenceWorkspace
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch("/api/requirements/list");
        if (!mounted) return;
        if (resp.ok) {
          const json = await resp.json();
          setRequirements(json.items || SAMPLE_REQUIREMENTS.filter(r => r.productId === productId));
        } else {
          // Fallback ke sample data jika API belum siap
          setRequirements(SAMPLE_REQUIREMENTS.filter(r => r.productId === productId));
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Failed to fetch requirements:", err);
        // Tetap pakai sample data untuk testing UI
        setRequirements(SAMPLE_REQUIREMENTS.filter(r => r.productId === productId));
        setError("Gagal terhubung ke requirements registry, menampilkan data contoh.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [productId]);

  // Filter requirements berdasarkan search dan status filter
  const filteredRequirements = requirements?.filter(req => {
    const matchesSearch = req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredRequirements.length / itemsPerPage);
  const paginatedRequirements = filteredRequirements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Loading state (memenuhi 11 visual state: loading)
  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Memuat requirements...</p>
      </div>
    );
  }

  // Empty state (memenuhi 11 visual state: empty / no data)
  if (paginatedRequirements.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Belum ada requirements</h3>
        <p className="text-slate-600 max-w-md mx-auto mb-6">
          Mulai tambahkan requirements pertama untuk produk {productId} dengan klik tombol "Tambah Requirement".
        </p>
        <button 
          onClick={() => {}}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition inline-block font-medium"
        >
          Tambah Requirement Baru
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Error notification (memenuhi 11 visual state: error) */}
      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-amber-800 text-sm">{error}</p>
        </div>
      )}

      {/* Header + Search + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Requirements</h1>
          <p className="text-slate-600 mt-1">Kelola semua persyaratan dan spesifikasi produk {productId}</p>
        </div>
        <button
          onClick={() => {}}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
        >
          + Tambah Requirement
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari requirements..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="all">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="in-progress">Dalam Proses</option>
          <option value="review">Dalam Review</option>
          <option value="completed">Selesai</option>
          <option value="blocked">Terkendala</option>
        </select>
      </div>

      {/* Requirements List (memenuhi 11 visual state: long content / many data) */}
      <div className="space-y-4">
        {paginatedRequirements.map((req) => (
          <div
            key={req.id}
            className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{req.title}</h3>
                <p className="text-slate-600 mb-4">{req.description}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[req.status]}`}>
                    {STATUS_LABELS[req.status]}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[req.priority]}`}>
                    {PRIORITY_LABELS[req.priority]}
                  </span>
                  <span className="text-xs text-slate-500">
                    Dibuat: {new Date(req.createdAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="flex sm:flex-col gap-2">
                <a
                  href={`/products/${productId}/requirements?requirementId=${req.id}`}
                  className="px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition font-medium"
                >
                  Lihat Detail
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (memenuhi 11 visual state: pagination) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Sebelumnya
          </button>
          <span className="px-4 py-2 text-sm text-slate-600">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Selanjutnya
          </button>
        </div>
      )}

      {/* Create Requirement Modal (placeholder jika showCreate=true) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Tambah Requirement Baru</h3>
              <button
                onClick={onCloseCreate}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  placeholder="Masukkan judul requirement"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={4}
                  placeholder="Masukkan deskripsi requirement"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioritas</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                    <option value="critical">Kritis</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="draft">Draft</option>
                    <option value="in-progress">Dalam Proses</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onCloseCreate}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition font-medium"
                >
                  Batal
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium"
                >
                  Simpan Requirement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}