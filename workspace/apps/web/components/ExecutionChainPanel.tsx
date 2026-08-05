import React from "react";

interface DeliveryPayload {
  readonly requirement: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly verificationStatus: string;
    readonly linkedCapabilityIds: readonly string[];
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

export interface ExecutionChainPanelProps {
  readonly payload: DeliveryPayload;
  readonly verification: VerificationDecisionPayload | null;
  readonly proof: VerificationProofPayload | null;
  readonly loading?: boolean;
  readonly error?: string | null;
}

function tone(value: boolean | undefined): string {
  return value
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function verdictTone(value: "passed" | "failed" | undefined): string {
  return value === "passed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";
}

function shortHash(value: string | undefined): string {
  return value ? `${value.slice(0, 12)}...` : "pending";
}

function yesNo(value: boolean | undefined): string {
  return value ? "yes" : "no";
}

export default function ExecutionChainPanel({
  payload,
  verification,
  proof,
  loading = false,
  error = null,
}: ExecutionChainPanelProps) {
  const evidencePaths =
    proof?.provenance.evidencePaths.length
      ? proof.provenance.evidencePaths
      : payload.delivery?.evidence.samplePaths ?? [];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Execution Chain
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            One requirement moving through RTM, evidence, verification, and proof.
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This is the visible EOS slice: the same runtime surface shows the requirement,
            traceability coverage, linked evidence, verification verdict, and computed proof.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Requirement <span className="font-mono">{payload.requirement.id}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Requirement
          </div>
          <div className="mt-3 text-sm font-medium text-slate-900">{payload.requirement.title}</div>
          <div className="mt-2 text-xs text-slate-600">Status: {payload.requirement.status}</div>
          <div className="mt-1 text-xs text-slate-600">
            Capabilities: {payload.requirement.linkedCapabilityIds.join(", ")}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            RTM
          </div>
          <div className="mt-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone(
                verification?.registryProjection.traceabilityComplete ??
                  payload.delivery?.traceability.complete,
              )}`}
            >
              complete:{" "}
              {yesNo(
                verification?.registryProjection.traceabilityComplete ??
                  payload.delivery?.traceability.complete,
              )}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            Artifacts:{" "}
            {verification?.registryProjection.artifactCount ??
              payload.delivery?.traceability.artifactCount ??
              0}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Gaps:{" "}
            {verification?.registryProjection.gaps.length ??
              payload.delivery?.traceability.gaps.length ??
              0}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Evidence
          </div>
          <div className="mt-3 text-sm font-medium text-slate-900">
            {verification?.registryProjection.evidenceMatchedCount ??
              payload.delivery?.evidence.matchedCount ??
              0}{" "}
            linked records
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Verification artifacts: {payload.delivery?.traceability.verificationArtifactCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Evidence artifacts: {payload.delivery?.traceability.evidenceArtifactCount ?? 0}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Verification
          </div>
          <div className="mt-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${verdictTone(
                verification?.verdict,
              )}`}
            >
              {verification?.verdict ?? payload.requirement.verificationStatus}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            Predicate: {verification?.predicateVersion ?? "loading"}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Lifecycle eligible: {yesNo(verification?.lifecycleEligible)}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Proof
          </div>
          <div className="mt-3 text-xs font-medium text-slate-900">
            {proof?.proofId ?? "Proof pending"}
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Predicate ID: {proof?.predicateId ?? "requirement-verification"}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Digest: {shortHash(proof?.proofDigest)}
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Computed Status
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Decision fingerprint</div>
              <div className="mt-1 font-mono">{shortHash(verification?.decisionFingerprint)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Evidence set hash</div>
              <div className="mt-1 font-mono">{shortHash(verification?.evidenceSetHash)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Proof digest</div>
              <div className="mt-1 font-mono">{shortHash(proof?.proofDigest)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">Evaluated at</div>
              <div className="mt-1">{proof?.evaluatedAt ?? "pending"}</div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Evidence Footprint
          </div>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Loading verification proof...</p>
          ) : error ? (
            <p className="mt-3 text-sm text-amber-700">{error}</p>
          ) : evidencePaths.length ? (
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              {evidencePaths.slice(0, 3).map((item) => (
                <li className="rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No linked evidence paths are available yet for this requirement.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
