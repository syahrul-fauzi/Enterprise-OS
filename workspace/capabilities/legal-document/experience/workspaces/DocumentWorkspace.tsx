"use client";

import React, { useMemo, useState } from "react";
import {
  documentService,
  type DocumentAggregate,
  type DocumentStatus,
} from "../../implementation/service";
import { DocumentCard } from "../components/DocumentCard";

type StatusFilter = DocumentStatus | "all";

export function DocumentWorkspace() {
  const initial = useMemo(
    () => documentService.searchDocuments({ limit: 50, offset: 0 }),
    []
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

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
