"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useLocale } from "@repo/presentation-hooks/use-locale/use-locale";
import type { ServiceRequestAggregate, ServiceRequestStatus, ServiceProviderCategory } from "../../implementation/contracts/service.contracts.js";
import { ServiceRequestCard } from "../components/ServiceRequestCard.js";
import { CreateServiceRequestModal, BatchCreateServiceRequestModal } from "../components/CreateServiceRequestModal.js";

type StatusFilter = ServiceRequestStatus | "all";
type CategoryFilter = ServiceProviderCategory | "all";
interface SearchServiceRequestsOutput {
  items: ServiceRequestAggregate[];
  total: number;
  matched: number;
  offset: number;
  limit: number;
}

export function ServicesWorkspace() {
  const { t } = useLocale();
  const [requests, setRequests] = useState<ServiceRequestAggregate[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // Fetch service requests from canonical API endpoint (maintains tenant/workspace isolation)
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        // Get current session context from cookies (maintain tenant/workspace isolation)
        const cookie = document.cookie;
        const sessionCookie = cookie.split(";").find(c => c.trim().startsWith("workspace-session="));
        let session = null;
        if (sessionCookie) {
          try {
            session = JSON.parse(atob(sessionCookie.split("=")[1]));
          } catch(e) {
            console.error("[ServicesWorkspace] Failed to decode session:", e);
          }
        }

        // Use shared rail API endpoint with proper session context (matches GET route pattern)
        const url = new URL("/api/service-requests/list", window.location.origin);
        url.searchParams.set("limit", "50");
        url.searchParams.set("offset", "0");
        const resp = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
        });
        if (resp.ok) {
          const data = await resp.json();
          setRequests(data.items || []);
          setTotalRequests(data.total || 0);
        } else {
          setRequests([]);
          setTotalRequests(0);
        }
      } catch (err) {
        console.error("[ServicesWorkspace] Failed to fetch service requests:", err);
        setRequests([]);
        setTotalRequests(0);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchRequests();

    // Listen for service-requests:refresh event to refetch after new request creation
    const handleRefresh = () => {
      setLoading(true);
      fetchRequests();
    };

    window.addEventListener('service-requests:refresh', handleRefresh);
    return () => window.removeEventListener('service-requests:refresh', handleRefresh);
  }, []);

  // Client-side filtering (matching capability layer logic)
  const result = useMemo(() => {
    let filtered = requests ? [...requests] : [];
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(q) || 
        (r.description?.toLowerCase() || "").includes(q)
      );
    }

    return {
      items: filtered,
      matched: filtered.length,
      total: totalRequests,
      offset: 0,
      limit: 50
    };
  }, [requests, query, statusFilter, categoryFilter]);

  const filtered: readonly ServiceRequestAggregate[] = result.items;
  const allCount = result.total;

  const statusOptions: readonly StatusFilter[] = [
    "all",
    "draft",
    "accepted",
    "in_service",
    "delivered",
    "verified",
  ] as const;

  // Map internal categories to locale-aware labels
  const categoryKeyMap: Record<ServiceProviderCategory, string> = {
    "Cloud Services": "services.category.cloud",
    "IT Support": "services.category.it",
    "Infrastructure": "services.category.infrastructure",
    "Cybersecurity": "services.category.cybersecurity",
    "Software Development": "services.category.software",
    "Managed Services": "services.category.managed",
    "Data & Analytics": "services.category.data",
  };

  // Map internal statuses to locale-aware labels
  const statusKeyMap: Record<ServiceRequestStatus, string> = {
    "draft": "services.status.draft",
    "accepted": "services.status.accepted",
    "in_service": "services.status.in_service",
    "delivered": "services.status.delivered",
    "verified": "services.status.verified",
  };

  const fmtOption = (key: string) => t(key);

  const handleCreateSubmit = async (data: {
    title: string;
    description: string;
    category: ServiceProviderCategory;
    budget?: string;
  }) => {
    // Get current session context from cookies (maintain tenant/workspace isolation)
    const cookie = document.cookie;
    const sessionCookie = cookie.split(";").find(c => c.trim().startsWith("workspace-session="));
    let session = null;
    if (sessionCookie) {
      try {
        session = JSON.parse(atob(sessionCookie.split("=")[1]));
      } catch(e) {
        console.error("[ServicesWorkspace] Failed to decode session:", e);
      }
    }

    // Use shared rail API endpoint with proper session context
    const resp = await fetch("/api/service-requests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        sessionId: session?.sessionId,
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        actorId: session?.actorId,
      }),
      credentials: "include",
    });
    if (!resp.ok) throw new Error("Failed to create service request");
    // Broadcast refresh event to update UI with new request
    window.dispatchEvent(new Event('service-requests:refresh'));
  };

  const handleBatchCreateSubmit = async (data: Array<{
    title: string;
    description: string;
    category: ServiceProviderCategory;
    budget?: string;
  }>) => {
    // Get current session context from cookies (maintain tenant/workspace isolation)
    const cookie = document.cookie;
    const sessionCookie = cookie.split(";").find(c => c.trim().startsWith("workspace-session="));
    let session = null;
    if (sessionCookie) {
      try {
        session = JSON.parse(atob(sessionCookie.split("=")[1]));
      } catch(e) {
        console.error("[ServicesWorkspace] Failed to decode session:", e);
      }
    }

    // Use shared rail API endpoint with proper session context
    const resp = await fetch("/api/service-requests/batch-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: data,
        sessionId: session?.sessionId,
        tenantId: session?.tenantId,
        workspaceId: session?.workspaceId,
        actorId: session?.actorId,
      }),
      credentials: "include",
    });
    if (!resp.ok) throw new Error("Failed to batch create service requests");
    // Broadcast refresh event to update UI with new requests
    window.dispatchEvent(new Event('service-requests:refresh'));
  };

  // Helper to replace placeholders in translated strings
  const fmt = (key: string, values: Record<string, string | number>) => {
    let str = t(key);
    Object.entries(values).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, String(v));
    });
    return str;
  };

  const hasAnyRequests = requests.length > 0;

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold">{t("services.title")}</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm opacity-70">
            {fmt("services.showing", { filtered: filtered.length, total: allCount, matched: result.matched })}
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="batch-create-service-request-button"
              onClick={() => setBatchModalOpen(true)}
              className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition"
              type="button"
            >
              {t("services.button.batchCreate")}
            </button>
            <button
              data-testid="create-service-request-button"
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              type="button"
            >
              {t("services.button.create")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          aria-label={t("services.search.placeholder")}
          className="px-3 py-1.5 border rounded text-sm w-full sm:max-w-xs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("services.search.placeholder")}
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
              {s === "all" ? "Semua" : fmtOption(statusKeyMap[s as ServiceRequestStatus])}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {categoryOptions.map((s) => (
            <button
              key={s}
              className={`text-xs px-2 py-1 rounded border transition ${
                categoryFilter === s
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => setCategoryFilter(s)}
              type="button"
            >
              {s === "all" ? "Semua" : fmtOption(categoryKeyMap[s as ServiceProviderCategory])}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm opacity-60 border rounded">
          {t("common.loading")}
        </div>
      ) : filtered.length === 0 ? (
        !hasAnyRequests ? (
          // Empty state - no requests at all
          <div className="p-12 text-center border border-dashed rounded space-y-4">
            <h3 className="text-lg font-semibold">{t("services.empty.heading")}</h3>
            <p className="text-sm opacity-70">{t("services.empty.subheading")}</p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              type="button"
            >
              {t("services.empty.cta")}
            </button>
          </div>
        ) : (
          // Filtered no matches state
          <div className="p-6 text-center text-sm opacity-60 border border-dashed rounded">
            {t("services.noMatches")}
          </div>
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <ServiceRequestCard key={r.id} item={r} />
          ))}
        </div>
      )}

      <CreateServiceRequestModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />
      <BatchCreateServiceRequestModal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSubmit={handleBatchCreateSubmit}
      />
    </div>
  );
}

export default ServicesWorkspace;