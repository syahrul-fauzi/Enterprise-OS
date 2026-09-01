"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useWorkspaceSession } from "@repo/presentation-hooks";
// Import ONLY types from server-side contracts (no implementations)
import {
  type DocumentAggregate,
  type DocumentStatus,
  type SearchDocumentsOutput,
  DocumentId,
} from "../../implementation/contracts/document.contracts";
import { DocumentCard } from "../components/DocumentCard";

type StatusFilter = DocumentStatus | "all";

export function DocumentWorkspace() {
  // Parse params client-side to avoid next/navigation dependency while preserving routing
  const [params, setParams] = useState<{ id?: string; action?: string }>({});
  const { session, authenticated, cachedSession, saveScrollPosition, restoreScrollPosition } = useWorkspaceSession();
  
  const [initial, setInitial] = useState<SearchDocumentsOutput | null>(null);
  
  useEffect(() => {
    if (session?.tenantId && session?.workspaceId) {
      // Use API route to fetch documents instead of inline server action (Next.js requirement)
      fetch("/api/documents/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50, offset: 0, tenantId: session.tenantId, workspaceId: session.workspaceId })
      })
        .then(res => res.json())
        .then(data => setInitial(data));
    }
  }, [session?.tenantId, session?.workspaceId]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  
  // C11-001: Edit state management (reused from RequirementWorkspace pattern)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse path client-side on mount and update, preserve same functionality without next/navigation
  useEffect(() => {
    if (!session?.tenantId || !session?.workspaceId) return;
    
    const parsePath = () => {
      const path = window.location.pathname;
      const matchCreate = path.match(/\/documents\/create$/);
      const matchEdit = path.match(/\/documents\/([^/]+)\/edit$/);
      const matchView = path.match(/\/documents\/([^/]+)$/);
      
      if (matchCreate) {
        setParams({ action: "create" });
        setIsCreating(true);
        setTitle("");
        setDescription("");
        setEditingDocumentId(null);
        setError(null);
        
        // Extract caseId from URL search params to link document to current work (case)
        const searchParams = new URLSearchParams(window.location.search);
        const caseIdFromUrl = searchParams.get("caseId");
        if (caseIdFromUrl) {
          // Pre-set title with case context - user can edit
          setTitle(`Document for Case ${caseIdFromUrl.substring(0, 8)}...`);
        }
      } else if (matchEdit) {
        const id = matchEdit[1];
        if (!id) return;
        setParams({ id, action: "edit" });
        const document = documentService.getDocument({ id: DocumentId(id), tenantId: session.tenantId, workspaceId: session.workspaceId });
        if (document) {
          handleEdit(document);
        }
      } else if (matchView) {
        const id = matchView[1];
        if (!id) return;
        setParams({ id });
        const document = documentService.getDocument({ id: DocumentId(id), tenantId: session.tenantId, workspaceId: session.workspaceId });
        if (document) {
          handleEdit(document);
        }
      } else {
        // Default to list view
        setParams({});
        setIsCreating(false);
        setEditingDocumentId(null);
      }
    };

    // Initial parse
    parsePath();
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', parsePath);
    return () => window.removeEventListener('popstate', parsePath);
  }, [session?.tenantId, session?.workspaceId]);

  const result = useMemo(() => {
    if (!session?.tenantId || !session?.workspaceId) return { items: [] as readonly DocumentAggregate[], total: 0, matched: 0 };
    
    // Extract caseId from URL to filter documents by current work (case)
    const searchParams = new URLSearchParams(window.location.search);
    const caseIdFromUrl = searchParams.get("caseId");
    
    return documentService.searchDocuments({
      query,
      status: statusFilter,
      ...(caseIdFromUrl && { matterId: caseIdFromUrl }),
      limit: 50,
      offset: 0,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    });
  }, [query, statusFilter, session?.tenantId, session?.workspaceId]);

  const filtered: readonly DocumentAggregate[] = result.items;
  const totalCount = initial?.total ?? 0;

  const statusOptions: readonly StatusFilter[] = [
    "all",
    "draft",
    "review",
    "signed",
    "archived",
  ] as const;

// Redundant logic removed - path parsing unified in single useEffect above

  function resetForm() {
    setTitle("");
    setDescription("");
    setEditingDocumentId(null);
    setIsCreating(false);
    setError(null);
    // Return to documents list after creation/edit completion
    window.location.href = "/documents";
  }

  function handleEdit(item: DocumentAggregate) {
    setEditingDocumentId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setError(null);
  }

  // Unified submit handler for both create and edit
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      if (isCreating) {
        // Create new document using document.create capability - pass through matterId from caseId
        const searchParams = new URLSearchParams(window.location.search);
        const caseIdFromUrl = searchParams.get("caseId");
        const response = await fetch("/api/capabilities/legal-document/document.create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            ...(caseIdFromUrl && { matterId: caseIdFromUrl }),
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as {
            readonly error?: string;
            readonly detail?: string;
          };
          throw new Error(
            payload.detail ??
            payload.error ??
            "Failed to create document"
          );
        }
      } else if (editingDocumentId) {
        // Update existing document using document.update capability
        const response = await fetch("/api/capabilities/legal-document/document.update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingDocumentId,
            title,
            description,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as {
            readonly error?: string;
            readonly detail?: string;
          };
          throw new Error(
            payload.detail ??
            payload.error ??
            "Failed to update document"
          );
        }
      } else {
        throw new Error("No document selected for editing or creation");
      }

      resetForm();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelEdit() {
    resetForm();
  }

  // C11-001: Create/Edit form - minimal human-facing surface
  if (editingDocumentId || isCreating) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
        <h2 className="text-xl font-bold text-gray-800">{isCreating ? "Create New Document" : "Edit Document"}</h2>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter document content..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : isCreating ? "Create Document" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Original document list view (unchanged)
  // Extract caseId to show context in document list
  const searchParams = new URLSearchParams(window.location.search);
  const caseIdFromUrl = searchParams.get("caseId");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (initial === null) {
    return (
      <div className="p-12 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Memuat dokumen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center border-2 border-red-200 rounded-3xl bg-red-50">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-red-800 mb-2">Gagal memuat dokumen</h3>
        <p className="text-red-600 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Belum ada dokumen</h3>
        <p className="text-slate-600 max-w-md mx-auto mb-6">
          Mulai buat dokumen pertama Anda untuk mengelola pekerjaan legal secara terstruktur.
        </p>
        <a
          href="/documents/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
        >
          <span aria-hidden>＋</span>
          Buat Dokumen Pertama
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 border-0 rounded-none bg-white shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Legal Documents</h2>
          {caseIdFromUrl && (
            <p className="text-sm text-slate-500 mt-1">
              Showing documents for Case #{caseIdFromUrl.substring(0, 8)}...
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>
            showing {paginatedItems.length} of {filtered.length} (total {totalCount})
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          aria-label="Search documents"
          className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm w-full sm:max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Search documents..."
          value={query}
        />
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              className={`text-xs px-3 py-1.5 rounded-xl border transition font-medium ${
                statusFilter === s
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
              type="button"
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Tidak ada dokumen yang cocok</h3>
          <p className="text-slate-500">Coba ubah filter atau kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedItems.map((d: DocumentAggregate) => (
              <DocumentCard key={d.id} item={d} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Halaman {currentPage} dari {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DocumentWorkspace;