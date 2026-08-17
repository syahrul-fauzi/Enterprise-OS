"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { ServiceRequestAggregate, ServiceRequestStatus, ServiceProviderCategory } from "../../implementation/contracts/service.contracts.js";
import { ServiceRequestCard } from "../components/ServiceRequestCard.js";
import { CreateServiceRequestModal } from "../components/CreateServiceRequestModal.js";

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
  const [requests, setRequests] = useState<ServiceRequestAggregate[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

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

  const categoryOptions: readonly CategoryFilter[] = [
    "all",
    "Cloud Services",
    "IT Support",
    "Infrastructure",
    "Cybersecurity",
    "Software Development",
    "Managed Services",
    "Data & Analytics",
  ] as const;

  const fmtOption = (s: string) => s.replace("_", " ");

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

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-xl font-bold">Service Requests</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm opacity-70">
            showing {filtered.length} of {allCount} (matched {result.matched})
          </div>
          <button
            data-testid="create-service-request-button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            type="button"
          >
            Buat Permintaan Layanan Baru
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          aria-label="Search service requests"
          className="px-3 py-1.5 border rounded text-sm w-full sm:max-w-xs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search service requests..."
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
              {fmtOption(s)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm opacity-60 border rounded">
          Loading service requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-center text-sm opacity-60 border border-dashed rounded">
          No service requests match the current filters.
        </div>
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
    </div>
  );
}

export default ServicesWorkspace;