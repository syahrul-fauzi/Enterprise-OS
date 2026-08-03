"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {
  RequirementAggregate,
  RequirementPriority,
  RequirementStatus,
  RequirementVerificationStatus,
} from "../../implementation/contracts";
import {
  RequirementCard,
  type RequirementAction,
} from "../components/RequirementCard";

type StatusFilter = RequirementStatus | "all";
type PriorityFilter = RequirementPriority | "all";
type VerificationFilter = RequirementVerificationStatus | "all";

interface RequirementSearchResponse {
  readonly items: readonly RequirementAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly limit: number;
  readonly offset: number;
}

const STATUS_OPTIONS: readonly StatusFilter[] = [
  "all",
  "draft",
  "approved",
  "in_delivery",
  "implemented",
  "verified",
] as const;

const PRIORITY_OPTIONS: readonly PriorityFilter[] = [
  "all",
  "low",
  "medium",
  "high",
  "critical",
] as const;

const VERIFICATION_OPTIONS: readonly VerificationFilter[] = [
  "all",
  "not_ready",
  "pending",
  "passed",
  "failed",
] as const;

function optionLabel(value: string): string {
  return value === "all"
    ? "All"
    : value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

async function readRequirements(params: {
  readonly query: string;
  readonly status: StatusFilter;
  readonly priority: PriorityFilter;
  readonly verificationStatus: VerificationFilter;
}): Promise<RequirementSearchResponse> {
  const search = new URLSearchParams();
  if (params.query.trim()) search.set("q", params.query.trim());
  if (params.status !== "all") search.set("status", params.status);
  if (params.priority !== "all") search.set("priority", params.priority);
  if (params.verificationStatus !== "all") {
    search.set("verificationStatus", params.verificationStatus);
  }

  const response = await fetch(`/api/requirements?${search.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to load requirements (${response.status})`);
  }
  return (await response.json()) as RequirementSearchResponse;
}

export function RequirementWorkspace() {
  const [requirements, setRequirements] = useState<readonly RequirementAggregate[]>([]);
  const [total, setTotal] = useState(0);
  const [matched, setMatched] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState<RequirementPriority>("medium");
  const [linkedCapabilities, setLinkedCapabilities] = useState("EOS-001");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(
    "Requirement is searchable\nRequirement has owner\nRequirement links capabilities",
  );
  const [submitting, setSubmitting] = useState(false);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await readRequirements({
          query,
          status: statusFilter,
          priority: priorityFilter,
          verificationStatus: verificationFilter,
        });
        setRequirements(result.items);
        setTotal(result.total);
        setMatched(result.matched);
      } catch (raw) {
        const next = raw instanceof Error ? raw.message : String(raw);
        setError(next);
      } finally {
        setLoading(false);
      }
    },
    [priorityFilter, query, statusFilter, verificationFilter],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          owner,
          priority,
          linkedCapabilityIds: linkedCapabilities
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          acceptanceCriteria: acceptanceCriteria
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { readonly error?: string };
        throw new Error(payload.error ?? "Failed to create requirement");
      }
      setTitle("");
      setSummary("");
      setOwner("");
      setPriority("medium");
      setLinkedCapabilities("EOS-001");
      setAcceptanceCriteria(
        "Requirement is searchable\nRequirement has owner\nRequirement links capabilities",
      );
      await refresh();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(id: string, action: RequirementAction) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as {
          readonly error?: string;
          readonly detail?: string;
        };
        throw new Error(payload.detail ?? payload.error ?? "Requirement action failed");
      }
      await refresh();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setBusyId(null);
    }
  }

  const verifiedCount = requirements.filter((item) => item.status === "verified").length;

  return (
    <div className="space-y-4">
      <section className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Requirement Management
            </h2>
            <p className="text-sm text-gray-500">
              Canonical requirement capture, delivery progression, and verification
              tracking for EOS work.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
            <div className="px-3 py-2 rounded border bg-gray-50">Total: {total}</div>
            <div className="px-3 py-2 rounded border bg-gray-50">Matched: {matched}</div>
            <div className="px-3 py-2 rounded border bg-gray-50">
              Verified: {verifiedCount}
            </div>
            <div className="px-3 py-2 rounded border bg-gray-50">
              Ready To Work: {requirements.filter((item) => item.status !== "verified").length}
            </div>
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <input
            className="px-3 py-2 border rounded text-sm"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Requirement title"
            value={title}
          />
          <input
            className="px-3 py-2 border rounded text-sm"
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner"
            value={owner}
          />
          <input
            className="px-3 py-2 border rounded text-sm md:col-span-2"
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Summary"
            value={summary}
          />
          <input
            className="px-3 py-2 border rounded text-sm"
            onChange={(event) => setLinkedCapabilities(event.target.value)}
            placeholder="Linked capabilities (comma separated)"
            value={linkedCapabilities}
          />
          <select
            className="px-3 py-2 border rounded text-sm"
            onChange={(event) => setPriority(event.target.value as RequirementPriority)}
            value={priority}
          >
            {PRIORITY_OPTIONS.filter((item) => item !== "all").map((item) => (
              <option key={item} value={item}>
                {optionLabel(item)}
              </option>
            ))}
          </select>
          <textarea
            className="px-3 py-2 border rounded text-sm md:col-span-2"
            onChange={(event) => setAcceptanceCriteria(event.target.value)}
            placeholder="Acceptance criteria, one per line"
            rows={3}
            value={acceptanceCriteria}
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              className="px-4 py-2 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
              disabled={submitting || title.trim().length === 0}
              type="submit"
            >
              {submitting ? "Creating..." : "Create Requirement"}
            </button>
          </div>
        </form>
      </section>

      <section className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            aria-label="Search requirements"
            className="px-3 py-2 border rounded text-sm w-full sm:max-w-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search requirements..."
            value={query}
          />
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((item) => (
              <button
                className={`text-xs px-2 py-1 rounded border ${
                  statusFilter === item
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-300"
                }`}
                key={item}
                onClick={() => setStatusFilter(item)}
                type="button"
              >
                {optionLabel(item)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_OPTIONS.map((item) => (
              <button
                className={`text-xs px-2 py-1 rounded border ${
                  priorityFilter === item
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-300"
                }`}
                key={item}
                onClick={() => setPriorityFilter(item)}
                type="button"
              >
                {optionLabel(item)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {VERIFICATION_OPTIONS.map((item) => (
              <button
                className={`text-xs px-2 py-1 rounded border ${
                  verificationFilter === item
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-300"
                }`}
                key={item}
                onClick={() => setVerificationFilter(item)}
                type="button"
              >
                {optionLabel(item)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 text-sm text-gray-500 border border-dashed rounded">
            Loading requirements...
          </div>
        ) : requirements.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 border border-dashed rounded">
            No requirements match the current filters.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {requirements.map((item) => (
              <RequirementCard
                busy={busyId === item.id}
                item={item}
                key={item.id}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default RequirementWorkspace;
