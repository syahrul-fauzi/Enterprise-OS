"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import type { ProductDeliveryCopy } from "../lib/product-experience";
import ExecutionChainPanel from "./ExecutionChainPanel";

type RequirementStatus =
  | "draft"
  | "approved"
  | "in_delivery"
  | "implemented"
  | "verified";

type VerificationStatus = "not_ready" | "pending" | "passed" | "failed";

interface DeliveryWorkspaceProps {
  readonly productId: string;
  readonly displayName: string;
  readonly requirementId?: string;
  readonly copy?: ProductDeliveryCopy;
}

interface DeliveryPayload {
  readonly requirement: {
    readonly id: string;
    readonly title: string;
    readonly summary?: string;
    readonly owner?: string;
    readonly status: RequirementStatus;
    readonly verificationStatus: VerificationStatus;
    readonly priority: string;
    readonly linkedCapabilityIds: readonly string[];
    readonly acceptanceCriteria: readonly string[];
  };
  readonly delivery: {
    readonly traceability: {
      readonly complete: boolean;
      readonly artifactCount: number;
      readonly verificationArtifactCount: number;
      readonly evidenceArtifactCount: number;
      readonly gaps: readonly string[];
    };
    readonly evidence: {
      readonly matchedCount: number;
      readonly latestUpdatedAt: string | null;
      readonly samplePaths: readonly string[];
    };
  } | null;
  readonly workflow: {
    readonly status: "passed" | "failed" | "skipped";
    readonly steps: ReadonlyArray<{
      readonly stepId: string;
      readonly kind: string;
      readonly status: "passed" | "failed" | "skipped";
      readonly summary: string;
    }>;
    readonly output: {
      readonly readyForWorkflow?: boolean;
      readonly evidenceCount?: number;
      readonly traceabilityGapCount?: number;
    };
  };
}

interface DeliveryEvidenceCreateResponse {
  readonly requirementId: string;
  readonly artifactPath: string;
  readonly requirementRef: string;
  readonly runId: string;
  readonly digest: string;
}

interface VerificationDecisionPayload {
  readonly predicateVersion: string;
  readonly verdict: "passed" | "failed";
  readonly lifecycleEligible: boolean;
  readonly decisionFingerprint: string;
  readonly evidenceSetHash: string;
  readonly registryProjection: {
    readonly traceabilityComplete: boolean;
    readonly artifactCount: number;
    readonly evidenceMatchedCount: number;
    readonly gaps: readonly string[];
  };
}

interface VerificationProofPayload {
  readonly proofId: string;
  readonly predicateId: string;
  readonly predicateVersion: string;
  readonly decision: "passed" | "failed";
  readonly proofDigest: string;
  readonly decisionFingerprint: string;
  readonly evaluatedAt: string;
  readonly provenance: {
    readonly evidencePaths: readonly string[];
    readonly evidenceIds: readonly string[];
  };
}

function statusTone(status: string): string {
  switch (status) {
    case "verified":
    case "passed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "implemented":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "in_delivery":
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

async function readDelivery(requirementId: string): Promise<DeliveryPayload> {
  const response = await fetch(`/api/delivery?requirementId=${encodeURIComponent(requirementId)}`, {
    cache: "no-store",
  });

  if (response.status === 401) {
    await fetch("/api/session", { cache: "no-store" });
    const retry = await fetch(`/api/delivery?requirementId=${encodeURIComponent(requirementId)}`, {
      cache: "no-store",
    });
    if (!retry.ok) {
      throw new Error(`Failed to load delivery workspace (${retry.status})`);
    }
    return (await retry.json()) as DeliveryPayload;
  }

  if (!response.ok) {
    throw new Error(`Failed to load delivery workspace (${response.status})`);
  }

  return (await response.json()) as DeliveryPayload;
}

async function readRequirementRuntime<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });

  if (response.status === 401) {
    await fetch("/api/session", { cache: "no-store" });
    const retry = await fetch(path, { cache: "no-store" });
    if (!retry.ok) {
      throw new Error(`Failed to load runtime proof (${retry.status})`);
    }
    return (await retry.json()) as T;
  }

  if (!response.ok) {
    throw new Error(`Failed to load runtime proof (${response.status})`);
  }

  return (await response.json()) as T;
}

export function DeliveryWorkspace({
  productId,
  displayName,
  requirementId,
  copy,
}: DeliveryWorkspaceProps) {
  const [payload, setPayload] = useState<DeliveryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [latestArtifactPath, setLatestArtifactPath] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationDecisionPayload | null>(null);
  const [proof, setProof] = useState<VerificationProofPayload | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);

  const refresh = useMemo(
    () => async () => {
      if (!requirementId) {
        setLoading(false);
        setPayload(null);
        setVerification(null);
        setProof(null);
        setChainError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setChainError(null);
      setVerification(null);
      setProof(null);
      try {
        const deliveryPayload = await readDelivery(requirementId);
        setPayload(deliveryPayload);

        const [verificationResult, proofResult] = await Promise.allSettled([
          readRequirementRuntime<VerificationDecisionPayload>(
            `/api/requirements/${encodeURIComponent(requirementId)}/verification`,
          ),
          readRequirementRuntime<VerificationProofPayload>(
            `/api/requirements/${encodeURIComponent(requirementId)}/proof`,
          ),
        ]);

        if (verificationResult.status === "fulfilled") {
          setVerification(verificationResult.value);
        } else {
          setVerification(null);
        }

        if (proofResult.status === "fulfilled") {
          setProof(proofResult.value);
        } else {
          setProof(null);
        }

        if (
          verificationResult.status === "rejected" ||
          proofResult.status === "rejected"
        ) {
          setChainError("Verification proof is not fully available yet. Refresh after the next runtime update.");
        }
      } catch (raw) {
        setError(raw instanceof Error ? raw.message : String(raw));
      } finally {
        setLoading(false);
      }
    },
    [requirementId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleRequirementAction(action: "mark_implemented" | "verify") {
    // Record user interaction untuk EOS runtime tracking
    recordRuntimeInvocation({
      capabilityId: "product-delivery",
      operationId: `requirement.${action}`,
      sourceRef: "apps/web/components/DeliveryWorkspace.tsx:handleRequirementAction",
      success: true,
      input: { productId, requirementId, action },
      result: { timestamp: new Date().toISOString() }
    });
    if (!payload) {
      return;
    }

    setBusyAction(action);
    setError(null);
    try {
      const response = await fetch(`/api/requirements/${payload.requirement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const problem = (await response.json()) as {
          readonly error?: string;
          readonly detail?: string;
        };
        throw new Error(problem.detail ?? problem.error ?? "Delivery action failed");
      }
      await refresh();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateEvidenceArtifact() {
    if (!payload) {
      return;
    }

    setBusyAction("attach_evidence");
    setError(null);
    try {
      const response = await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirementId: payload.requirement.id }),
      });
      if (!response.ok) {
        const problem = (await response.json()) as {
          readonly error?: string;
          readonly detail?: string;
        };
        throw new Error(problem.detail ?? problem.error ?? "Failed to create delivery evidence");
      }
      const result = (await response.json()) as DeliveryEvidenceCreateResponse;
      setLatestArtifactPath(result.artifactPath);
      await refresh();
    } catch (raw) {
      setError(raw instanceof Error ? raw.message : String(raw));
    } finally {
      setBusyAction(null);
    }
  }

  const nextAction =
    payload?.requirement.status === "in_delivery"
      ? "mark_implemented"
      : payload?.requirement.status === "implemented"
        ? "verify"
        : null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {copy?.badgeLabel ?? "Delivery Workspace"}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {copy?.title ?? `${displayName} delivery execution`}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {copy?.description ??
                "Move one requirement through delivery review, inspect traceability and evidence, then complete implementation and verification from the same public runtime surface."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={`/products/${productId}/requirements`}
            >
              {copy?.backLabel ?? "Back to workflow"}
            </Link>
            {requirementId ? (
              <button
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white"
                onClick={() => void refresh()}
                type="button"
              >
                {copy?.refreshLabel ?? "Refresh Delivery Context"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {!requirementId ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm">
          {copy?.missingRequirementMessage ??
            "Delivery workspace needs a `requirementId` query parameter."}
        </section>
      ) : loading ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm">
          {copy?.loadingMessage ?? "Loading delivery context..."}
        </section>
      ) : error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          <div className="font-semibold">
            {copy?.errorTitle ?? "Delivery workspace needs attention"}
          </div>
          <p className="mt-2">{error}</p>
        </section>
      ) : payload ? (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy?.objectLabel ?? "Requirement"}
              </div>
              <div className="mt-2 text-sm font-medium text-slate-900">{payload.requirement.id}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy?.statusLabel ?? "Status"}
              </div>
              <div className="mt-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(payload.requirement.status)}`}>
                  {payload.requirement.status}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy?.proofLabel ?? "Verification"}
              </div>
              <div className="mt-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(payload.requirement.verificationStatus)}`}>
                  {payload.requirement.verificationStatus}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {copy?.evidenceRecordsLabel ?? "Evidence Records"}
              </div>
              <div className="mt-2 text-sm font-medium text-slate-900">
                {payload.delivery?.evidence.matchedCount ?? 0}
              </div>
            </div>
          </section>

          <ExecutionChainPanel
            error={chainError}
            loading={loading}
            payload={payload}
            proof={proof}
            verification={verification}
          />

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{payload.requirement.title}</h3>
                  {payload.requirement.summary ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{payload.requirement.summary}</p>
                  ) : null}
                </div>
                {payload.requirement.owner ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                    {(copy?.ownerLabel ?? "Owner") + ": " + payload.requirement.owner}
                  </span>
                ) : null}
              </div>

              {copy?.showCapabilityIds !== false ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  {payload.requirement.linkedCapabilityIds.map((capabilityId) => (
                    <span
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono"
                      key={capabilityId}
                    >
                      {capabilityId}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {copy?.progressTitle ?? "Traceability"}
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>Complete: {payload.delivery?.traceability.complete ? "yes" : "no"}</div>
                    <div>Artifacts: {payload.delivery?.traceability.artifactCount ?? 0}</div>
                    <div>
                      Verification artifacts: {payload.delivery?.traceability.verificationArtifactCount ?? 0}
                    </div>
                    <div>
                      Evidence artifacts: {payload.delivery?.traceability.evidenceArtifactCount ?? 0}
                    </div>
                  </div>
                  {payload.delivery?.traceability.gaps.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-700">
                      {payload.delivery.traceability.gaps.map((gap) => (
                        <li key={gap}>{gap}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {copy?.evidenceTitle ?? "Evidence"}
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>Matched records: {payload.delivery?.evidence.matchedCount ?? 0}</div>
                    <div>
                      Latest update: {payload.delivery?.evidence.latestUpdatedAt ?? "not available"}
                    </div>
                    <div>Workflow ready: {payload.workflow.output.readyForWorkflow ? "yes" : "no"}</div>
                  </div>
                  {payload.delivery?.evidence.samplePaths.length ? (
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {payload.delivery.evidence.samplePaths.map((path) => (
                        <li className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono" key={path}>
                          {path}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {copy?.actionTitle ?? "Delivery action"}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {copy?.actionDescription ??
                    "This workspace is the execution checkpoint after `Start Delivery`: review readiness, inspect evidence, then advance implementation and verification from here."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                    disabled={busyAction !== null}
                    onClick={() => void handleCreateEvidenceArtifact()}
                    type="button"
                  >
                    {busyAction === "attach_evidence"
                      ? "Writing Evidence..."
                      : payload.delivery?.evidence.matchedCount
                        ? copy?.addEvidenceLabel ?? "Attach Another Evidence Artifact"
                        : copy?.createEvidenceLabel ?? "Create Delivery Evidence"}
                  </button>
                  {nextAction === "mark_implemented" ? (
                    <button
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      disabled={busyAction !== null}
                      onClick={() => void handleRequirementAction("mark_implemented")}
                      type="button"
                    >
                      {busyAction === "mark_implemented"
                        ? "Working..."
                        : copy?.markImplementedLabel ?? "Mark Implemented"}
                    </button>
                  ) : null}
                  {nextAction === "verify" ? (
                    <button
                      className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      disabled={busyAction !== null || (payload.delivery?.evidence.matchedCount ?? 0) === 0}
                      onClick={() => void handleRequirementAction("verify")}
                      type="button"
                    >
                      {busyAction === "verify" ? "Working..." : copy?.verifyLabel ?? "Verify"}
                    </button>
                  ) : null}
                  {nextAction === null ? (
                    <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                      {copy?.completeLabel ?? "Delivery lifecycle is complete."}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {(payload.delivery?.evidence.matchedCount ?? 0) === 0
                    ? copy?.blockedVerificationMessage ??
                      "Verification stays blocked until at least one delivery evidence artifact is attached."
                    : `${copy?.evidenceLinkedPrefix ?? "Evidence artifacts linked:"} ${
                        payload.delivery?.evidence.matchedCount ?? 0
                      }`}
                  {latestArtifactPath ? ` Latest artifact: ${latestArtifactPath}` : ""}
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-950">
                {copy?.readinessTitle ?? "Workflow readiness"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {copy?.readinessDescription ??
                  "Shared governance view over requirement, traceability, and evidence before completion."}
              </p>
              <div className="mt-4">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(payload.workflow.status)}`}>
                  {payload.workflow.status}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {payload.workflow.steps.map((step) => (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={step.stepId}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-900">{step.stepId}</div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone(step.status)}`}>
                        {step.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {step.kind}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.summary}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default DeliveryWorkspace;
