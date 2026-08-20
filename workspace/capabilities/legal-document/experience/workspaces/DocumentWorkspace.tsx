"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  documentService,
  type DocumentAggregate,
  type DocumentStatus,
  DocumentId,
} from "../../implementation/service.js";
import { DocumentCard } from "../components/DocumentCard.js";

type StatusFilter = DocumentStatus | "all";

export function DocumentWorkspace() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  
  const initial = useMemo(
    () => documentService.searchDocuments({ limit: 50, offset: 0 }),
    []
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  
  // C11-001: Edit state management (reused from RequirementWorkspace pattern)
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => {
    return documentService.searchDocuments({
      query,
      status: statusFilter,
      limit: 50,
      offset: 0,
    });
  }, [query, statusFilter]);

  const filtered: readonly DocumentAggregate[] = result.items;
  const totalCount = initial.total;

  const statusOptions: readonly StatusFilter[] = [
    "all",
    "draft",
    "review",
    "signed",
    "archived",
  ] as const;

  // C11-001: Load document into edit state when routed to /documents/:id/edit
  useEffect(() => {
    if (params.id) {
      const document = documentService.getDocument({ id: DocumentId(params.id) });
      if (document) {
        handleEdit(document);
      }
    }
  }, [params.id]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setEditingDocumentId(null);
    setError(null);
    // Return to documents list after edit completion
    router.push("/documents");
  }

  function handleEdit(item: DocumentAggregate) {
    setEditingDocumentId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setError(null);
  }

  // C11-001: Submit edits using existing document.update capability
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      if (!editingDocumentId) {
        throw new Error("No document selected for editing");
      }

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

  // C11-001: Edit form - minimal human-facing surface
  if (editingDocumentId) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
        <h2 className="text-xl font-bold text-gray-800">Edit Document</h2>
        
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
              {submitting ? "Saving..." : "Save Changes"}
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
  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-800">Legal Documents</h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            showing {filtered.length} of {totalCount} (matched {result.matched})
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          aria-label="Search documents"
          className="px-3 py-1.5 border rounded text-sm w-full sm:max-w-xs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents..."
          value={query}
        />
        <div className="flex flex-wrap gap-1">
          {statusOptions.map((s) => (
            <button
              key={s}
              className={`text-xs px-2 py-1 rounded border transition ${
                statusFilter === s
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setStatusFilter(s)}
              type="button"
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500 border border-dashed rounded">
          No documents match the current filters.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((d: DocumentAggregate) => (
            <DocumentCard key={d.id} item={d} />
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentWorkspace;