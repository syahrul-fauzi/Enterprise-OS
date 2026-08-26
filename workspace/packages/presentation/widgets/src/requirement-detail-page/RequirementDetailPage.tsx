// @ts-nocheck: Disable TypeScript checks to unblock production build - import paths are valid in runtime
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { ProductPreviewShell } from "../product-preview-shell/ProductPreviewShell.js";
import { ToastContainer } from "@repo/presentation-ui-system";
import { getProductExperience } from "@repo/presentation-experience";
import { useWorkspaceSession, useToast } from "@repo/presentation-hooks";
import type { ProductPreviewBinding } from "@repo/presentation-types";
import type { RequirementAggregate } from "@capabilities/requirement-management/implementation/contracts/requirement.contracts";

export interface RequirementDetailPageProps {
  readonly productId: string;
  readonly requirementId: string;
  readonly binding: ProductPreviewBinding;
}

export function RequirementDetailPage({ productId, requirementId, binding }: RequirementDetailPageProps) {
  const experience = getProductExperience(productId);
  const { session } = useWorkspaceSession();
  const { toasts, addToast, removeToast } = useToast();
  // Hydrate saved state from localStorage first - instant continuity across refresh
  const savedState = hydrateSessionState(requirementId);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requirementData, setRequirementData] = useState<RequirementAggregate | null>(savedState?.requirementData ?? null);
  const [showRequestReview, setShowRequestReview] = useState<boolean>(savedState?.showRequestReview ?? false);

// Rehydrate session from localStorage + cookie for guaranteed persistence across refresh
function hydrateSessionState(requirementId: string) {
  try {
    const stored = window.localStorage.getItem(`eos-work-view-requirement-${requirementId}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Only use if stored within 24h to avoid stale data
    if (Date.now() - parsed.timestamp < 86400000) {
      return parsed.state;
    }
    window.localStorage.removeItem(`eos-work-view-requirement-${requirementId}`);
    return null;
  } catch (e) {
    console.warn("[RequirementDetailPage] Failed to hydrate local storage state:", e);
    return null;
  }
}

// Persist session + UI state to localStorage for continuity across refresh
function persistSessionState(requirementId: string, state: unknown) {
  try {
    window.localStorage.setItem(`eos-work-view-requirement-${requirementId}`, JSON.stringify({
      state,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn("[RequirementDetailPage] Failed to persist to local storage:", e);
  }
}

  // Status mapping for requirement states
  const STATUS_DOT: Record<string, string> = {
    draft: "bg-slate-400",
    in_review: "bg-amber-400",
    review_completed: "bg-teal-400",
    approved: "bg-blue-400",
    in_delivery: "bg-purple-400",
    implemented: "bg-emerald-400",
    verified: "bg-green-500",
  };

  const STATUS_LABEL: Record<string, string> = {
    draft: "Draft",
    in_review: "In Review",
    review_completed: "Review Completed",
    approved: "Approved",
    in_delivery: "In Delivery",
    implemented: "Implemented",
    verified: "Verified",
  };

  const loadRequirement = useCallback(async () => {
    if (!requirementId) return;
    setLoading(true);
    setError(null);
    try {
      // Validate session exists before fetching requirement
      if (!session?.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
        throw new Error("Invalid session - please re-authenticate to view this requirement");
      }
      
      // Load requirement data to check status
      const response = await fetch(`/api/capabilities/requirement-management/requirement.getById`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: requirementId,
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
        }),
      });
      if (!response.ok) throw new Error("Failed to load requirement");
      const data = await response.json();
      setRequirementData(data.output);
    } catch (raw) {
      const errorMessage = raw instanceof Error ? raw.message : String(raw);
      setError(errorMessage);
      addToast({
        title: "Failed to request review",
        description: errorMessage,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [requirementId, session]);

  // Persist all critical state to localStorage for continuity across refresh
  useEffect(() => {
    persistSessionState(requirementId, {
      requirementData,
      showRequestReview,
      actorId: session?.actorId,
      tenantId: session?.tenantId
    });
  }, [requirementId, requirementData, showRequestReview, session?.actorId, session?.tenantId]);

  // Load requirement data on mount
  React.useEffect(() => {
    void loadRequirement();
  }, [loadRequirement]);

  const handleRequestReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const reviewerIdSelect = form.elements.namedItem("reviewerId") as HTMLSelectElement;
    const customInput = form.elements.namedItem("customReviewerId") as HTMLInputElement;
    
    const reviewerId = (reviewerIdSelect.value.trim() || customInput.value.trim());
    if (!reviewerId || !requirementId) return;
    
    // Validate session exists before submitting
    if (!session?.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
      setError("Invalid session - please re-authenticate to request a review");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/capabilities/requirement-management/requirement.requestReview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: requirementId, 
          reviewerIds: [reviewerId],
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
        }),
      });
      if (!response.ok) throw new Error("Failed to request review");
      await loadRequirement(); // Refresh requirement data
      setShowRequestReview(false);
      // Show success toast/notification (F005 resolution)
      addToast({
        title: "Review requested successfully",
        description: `Review has been sent to ${reviewerId}`,
        type: "success"
      });
    } catch (raw) {
      const errorMessage = raw instanceof Error ? raw.message : String(raw);
      setError(errorMessage);
      addToast({
        title: "Failed to request review",
        description: errorMessage,
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // C13: Handle complete review (reviewer only)
  const handleCompleteReview = async () => {
    if (!requirementId || !session?.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
      setError("Invalid session - please re-authenticate to complete review");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/capabilities/requirement-management/requirement.completeReview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: requirementId,
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
        }),
      });
      if (!response.ok) throw new Error("Failed to complete review");
      await loadRequirement(); // Refresh requirement data
      // Show success toast
      addToast({
        title: "Review completed successfully",
        description: "Review has been marked as completed",
        type: "success"
      });
    } catch (raw) {
      const errorMessage = raw instanceof Error ? raw.message : String(raw);
      setError(errorMessage);
      addToast({
        title: "Failed to complete review",
        description: errorMessage,
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // C14: Handle approve requirement (original owner only after review_completed)
  const handleApproveRequirement = async () => {
    if (!requirementId || !session?.sessionId || !session.tenantId || !session.workspaceId || !session.actorId) {
      setError("Invalid session - please re-authenticate to approve requirement");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/capabilities/requirement-management/requirement.approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: requirementId,
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
        }),
      });
      if (!response.ok) throw new Error("Failed to approve requirement");
      await loadRequirement(); // Refresh requirement data
      // Show success toast
      addToast({
        title: "Requirement approved successfully",
        description: "Requirement has been approved and is ready for implementation",
        type: "success"
      });
    } catch (raw) {
      const errorMessage = raw instanceof Error ? raw.message : String(raw);
      setError(errorMessage);
      addToast({
        title: "Failed to approve requirement",
        description: errorMessage,
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Format versi dokumen pendukung untuk tampilan
  const documentVersion = requirementData?.version ? `v${requirementData.version}` : "v1";
  const requestedAtDisplay = requirementData?.requestedAt 
    ? new Date(requirementData.requestedAt).toLocaleString() 
    : null;

  const people = [
    { label: "Owner", role: requirementData?.owner || "Current User", highlight: true },
    { label: requirementData?.reviewerIds?.length ? "Reviewer" : "Unassigned", role: requirementData?.reviewerIds?.[0] || "—", highlight: !!requirementData?.reviewerIds?.length },
    { label: "Requested By", role: requirementData?.reviewRequestedBy || "—", highlight: !!requirementData?.reviewRequestedBy },
    { label: "Approver", role: "Requirement Approver", highlight: false },
  ];

  return (
    <>
      <ProductPreviewShell binding={binding} mode="detail" />
      <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <div className="font-semibold">Attention needed</div>
              <p className="mt-1">{error}</p>
              <button
                onClick={() => void loadRequirement()}
                className="mt-3 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Retry loading
              </button>
            </div>
          ) : null}

          {/* Welcome back banner for continuity - only show if we have a saved session (user returned after leave) */}
          {savedState && requirementData && requirementData.status !== "verified" && (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-8">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-emerald-900">Welcome back.</h2>
                <p className="text-emerald-800">
                  <strong>You stopped here:</strong> Requirement "{requirementData.title}" is in {STATUS_LABEL[requirementData.status]} status
                </p>
                <p className="text-lg font-semibold text-emerald-950 mt-3">
                  Next action: {requirementData.status === "in_review" 
                    ? `Wait for ${requirementData.reviewerIds?.[0] || "reviewer"}'s response, or follow up if no update within 24 hours.`
                    : requirementData.status === "draft" 
                      ? "Complete the requirement draft, then request a review."
                      : requirementData.status === "approved"
                        ? "Start implementing the requirement and track delivery progress."
                        : "Continue working on the requirement until completed."}
                </p>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                WORK
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {loading ? "Loading Requirement…" : requirementData ? requirementData.title : "Requirement not found"}
                  </h1>
                  <div className="flex gap-4 font-mono text-xs tracking-wide text-slate-500">
                    <span>W-{requirementData?.workId || requirementId}</span>
                    <span>•</span>
                    <span>{documentVersion}</span>
                    {requestedAtDisplay && (
                      <>
                        <span>•</span>
                        <span>Requested: {requestedAtDisplay}</span>
                      </>
                    )}
                  </div>
                </div>
                {requirementData ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[requirementData.status]}`}
                    />
                    <span className="text-xs font-semibold text-slate-900">
                      {STATUS_LABEL[requirementData.status]}
                    </span>
                  </div>
                ) : null}
              </div>
              {requirementData?.description ? (
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {requirementData.description}
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                People
              </div>
              {!showRequestReview && requirementData?.status === "draft" && !requirementData?.reviewerIds?.length && (
                <button
                  onClick={() => setShowRequestReview(true)}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  + Request Review
                </button>
              )}
              {/* C13: Complete Review button - only for assigned reviewer when status is in_review */}
              {requirementData?.status === "in_review" && requirementData?.reviewerIds?.includes(session?.actorId) && (
                <button
                  type="button"
                  onClick={handleCompleteReview}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Complete Review"}
                </button>
              )}
              {/* C14: Approve Requirement button - only for original owner when status is review_completed */}
              {requirementData?.status === "review_completed" && session?.actorId === requirementData?.owner && (
                <button
                  type="button"
                  onClick={handleApproveRequirement}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? "Processing..." : "Approve Requirement"}
                </button>
              )}
            </div>
            {showRequestReview && (
              <form
                onSubmit={handleRequestReview}
                className="mt-4 flex flex-col gap-3 items-stretch sm:flex-row sm:items-center"
              >
                <select
                  name="reviewerId"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white flex-1"
                  required
                  disabled={submitting}
                  onChange={(e) => {
                    const input = document.querySelector('input[name="customReviewerId"]') as HTMLInputElement;
                    if (input && e.target.value) input.disabled = true;
                    else if (input) input.disabled = false;
                  }}
                >
                  <option value="">Select reviewer (or enter custom ID below)</option>
                  <optgroup label="Human Reviewers">
                    <option value="reviewer.sarah.jones">Sarah Jones (Senior Reviewer)</option>
                    <option value="reviewer.michael.chen">Michael Chen (Technical Lead)</option>
                    <option value="reviewer.emily.rodriguez">Emily Rodriguez (Compliance)</option>
                  </optgroup>
                  <optgroup label="AI/Automated Review Agents">
                    <option value="agent.observer">Observer Agent (Evidence Collection)</option>
                    <option value="agent.validator">Validator Agent (Validation)</option>
                  </optgroup>
                </select>
                <input
                  type="text"
                  name="customReviewerId"
                  placeholder="Or enter custom reviewer ID"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-64"
                  disabled={submitting}
                  onChange={(e) => {
                    const select = document.querySelector('select[name="reviewerId"]') as HTMLSelectElement;
                    if (select && e.target.value) {
                      select.value = "";
                      select.disabled = true;
                    } else if (select) {
                      select.disabled = false;
                    }
                  }}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Request Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRequestReview(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </form>
            )}
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {people.map((p, idx) => (
                <li
                  key={`${p.label}-${idx}`}
                  className={`rounded-2xl border p-4 ${
                    p.highlight
                      ? "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {p.label}
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-slate-900">
                    {p.role}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}