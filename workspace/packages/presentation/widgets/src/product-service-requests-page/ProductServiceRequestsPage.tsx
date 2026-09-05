"use client";

import React, { useEffect, useState } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell";
import type { ProductPreviewBinding } from "@repo/presentation-experience";
import { useWorkspaceSession, useLocale, usePageStates } from "@repo/presentation-hooks";
import { WorkRealityLoading, EmptyState, ErrorState, PermissionDenied, Pagination } from "@repo/presentation-ui-system";
import type { ServiceRequestAggregate, ServiceRequestPriority, ServiceRequestStatus } from "@capabilities/services-id/implementation/contracts/service-request.contracts";

export interface ProductServiceRequestsPageProps {
  readonly productId: string;
  readonly binding: ProductPreviewBinding;
  readonly requestId?: string | string[];
  readonly session?: unknown;
  readonly isNewServiceRequest?: boolean;
}

type ServiceRequestCategory = "Renovasi" | "Legal" | "Design" | "Marketing" | "IT Support" | "Jasa Lainnya";

const SERVICE_CATEGORIES: ServiceRequestCategory[] = ["Renovasi", "Legal", "Design", "Marketing", "IT Support", "Jasa Lainnya"];

export function ProductServiceRequestsPage({ 
  productId, 
  binding, 
  requestId, 
  session: serverSession, 
  isNewServiceRequest 
}: ProductServiceRequestsPageProps) {
  void requestId;
  void productId;
  void serverSession;
  const { session, authenticated, cachedSession } = useWorkspaceSession();
  const { t } = useLocale();
  const currentSession = session ?? cachedSession;
  const isAuthenticated = Boolean(currentSession?.actorId && currentSession?.actorId !== "anonymous.user") || authenticated;
  console.debug("[ProductServiceRequestsPage] Session check:", { authenticated, currentSession, isAuthenticated });

  // State management for create form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ServiceRequestPriority>("medium");
  const [category, setCategory] = useState<ServiceRequestCategory>("IT Support");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State management menggunakan usePageStates hook untuk standarisasi 9 UX states
  const {
    state,
    isLoading,
    hasError,
    showEmptyState,
    setLoading,
    setSuccess,
    setError,
    setEmpty,
    setLongContent,
    setPermissionDenied,
    goToPage,
    getPaginatedData,
  } = usePageStates<ServiceRequestAggregate[]>({
    initialPageSize: 10,
  });
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestAggregate[]>([]);

  // Locale-based priority labels
  const PRIORITY_LABEL: Record<ServiceRequestPriority, string> = {
    low: t("service-requests.priority.low") || "Rendah",
    medium: t("service-requests.priority.medium") || "Sedang",
    high: t("service-requests.priority.high") || "Tinggi",
    critical: t("service-requests.priority.critical") || "Kritis",
  };

  const STATUS_LABEL: Record<ServiceRequestStatus, string> = {
    draft: t("service-requests.status.draft") || "Draf",
    open: t("service-requests.status.open") || "Buka",
    in_progress: t("service-requests.status.in_progress") || "Dikerjakan",
    closed: t("service-requests.status.closed") || "Selesai",
  };

  // Auto-open create form if URL has new parameter or component is initialized as new
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (isNewServiceRequest || searchParams.get("new") === "service-request") {
      setShowCreate(true);
    }
  }, [isNewServiceRequest]);

  // Fetch existing service requests on component mount
  useEffect(() => {
    const fetchServiceRequests = async () => {
      if (!isAuthenticated) {
        setPermissionDenied();
        return;
      }

      setLoading();
      
      try {
        const resp = await fetch("/api/capabilities/services-id/service-request.list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: currentSession?.tenantId,
            workspaceId: currentSession?.workspaceId,
          }),
        });

        if (resp.ok) {
          const json = await resp.json();
          const requests = json.output || [];
          setServiceRequests(requests);
          
          if (requests.length === 0) {
            setEmpty();
          } else if (requests.length > 50) {
            setLongContent();
            setSuccess(requests, requests.length);
          } else {
            setSuccess(requests, requests.length);
          }
        }
      } catch (err) {
        console.error("[ProductServiceRequestsPage] Failed to fetch service requests:", err);
        setError("Gagal memuat daftar permintaan layanan. Silakan coba lagi nanti.");
      }
    };

    fetchServiceRequests();
  }, [isAuthenticated, currentSession, setLoading, setSuccess, setError, setEmpty, setLongContent, setPermissionDenied]);

  // Handle form submission for new service request
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch("/api/capabilities/services-id/service-request.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          category,
          sessionId: currentSession?.sessionId,
          tenantId: currentSession?.tenantId,
          workspaceId: currentSession?.workspaceId,
          actorId: currentSession?.actorId,
        }),
      });

      if (!resp.ok) {
        throw new Error("Failed to create service request");
      }

      const json = await resp.json();
      
      // Add new service request to local state
      setServiceRequests(prev => [...prev, {
        id: json.id,
        title: title.trim(),
        description: description.trim() || undefined,
        status: "draft" as ServiceRequestStatus,
        priority,
        category,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      // Reset form and close create modal
      setTitle("");
      setDescription("");
      setPriority("medium");
      setCategory("IT Support");
      setShowCreate(false);
      
    } catch (err) {
      console.error("[ProductServiceRequestsPage] Failed to create service request:", err);
      setError("Gagal membuat permintaan layanan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  // Permission denied state (menggunakan shared component)
  if (state.status === "permission-denied") {
    return (
      <ProductPreviewShell binding={binding}>
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <PermissionDenied
              title="Anda belum masuk"
              description="Silakan masuk terlebih dahulu untuk mengelola permintaan layanan."
              icon="🔒"
              backLabel="Masuk ke Workspace"
              onBack={() => window.location.href = "/enter"}
            />
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // Loading state (menggunakan shared component)
  if (isLoading) {
    return (
      <ProductPreviewShell binding={binding}>
        <WorkRealityLoading />
      </ProductPreviewShell>
    );
  }

  // Error state (menggunakan shared component)
  if (hasError) {
    return (
      <ProductPreviewShell binding={binding}>
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <ErrorState
              title="Terjadi Kesalahan"
              description={state.error || "Gagal memuat daftar permintaan layanan. Silakan coba lagi nanti."}
              icon="⚠️"
              retryLabel="Muat Ulang"
              onRetry={() => window.location.reload()}
            />
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // Empty state (menggunakan shared component)
  if (showEmptyState || serviceRequests.length === 0) {
    return (
      <ProductPreviewShell binding={binding}>
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <EmptyState
              title="Belum ada permintaan layanan"
              description="Buat permintaan layanan pertama Anda untuk memulai."
              icon="📋"
              actionLabel="Buat Permintaan Baru"
              onAction={() => setShowCreate(true)}
            />

            {/* Create form modal */}
            {showCreate && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-6">Buat Permintaan Layanan Baru</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Judul</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Judul permintaan layanan"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Deskripsi</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Deskripsi detail permintaan Anda"
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Prioritas</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as ServiceRequestPriority)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {Object.entries(PRIORITY_LABEL).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Kategori</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as ServiceRequestCategory)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                        disabled={submitting}
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                        disabled={submitting}
                      >
                        {submitting ? "Membuat..." : "Buat Permintaan"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </ProductPreviewShell>
    );
  }

  // Get paginated data dari usePageStates hook
  const paginatedRequests = getPaginatedData(serviceRequests);

  // Main content state with all requests and pagination
  return (
    <ProductPreviewShell binding={binding}>
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Permintaan Layanan</h1>
              <p className="text-text-secondary mt-1">Kelola semua permintaan layanan Anda dalam satu tempat</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition whitespace-nowrap"
            >
              + Buat Permintaan Baru
            </button>
          </div>

          {/* Service Requests List */}
          <div className="space-y-4">
            {paginatedRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{request.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === 'closed' ? 'bg-green-100 text-green-800' :
                        request.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        request.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {STATUS_LABEL[request.status]}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        request.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {PRIORITY_LABEL[request.priority]}
                      </span>
                    </div>
                    {request.description && (
                      <p className="text-text-secondary text-sm mb-3">{request.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {request.category && <span>Kategori: {request.category}</span>}
                      <span>Dibuat: {new Date(request.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination controls (menggunakan shared component) */}
          {state.pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={state.pagination.currentPage}
                totalPages={state.pagination.totalPages}
                onPageChange={goToPage}
                previousLabel="Sebelumnya"
                nextLabel="Selanjutnya"
                pageLabel="Halaman"
                ofLabel="dari"
              />
            </div>
          )}

          {/* Create form modal */}
          {showCreate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-6">Buat Permintaan Layanan Baru</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Judul</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Judul permintaan layanan"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deskripsi</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Deskripsi detail permintaan Anda"
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Prioritas</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as ServiceRequestPriority)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {Object.entries(PRIORITY_LABEL).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Kategori</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ServiceRequestCategory)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {SERVICE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {error && <p className="text-red-600 text-sm">{error}</p>}
                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                      disabled={submitting}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? "Membuat..." : "Buat Permintaan"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </ProductPreviewShell>
  );
}