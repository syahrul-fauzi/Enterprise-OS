import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import type { CapabilityGovernanceProjection } from "./governance-runtime.js";
import { readYamlArtifact } from "../../governance-runtime.js";
import { EOS_ROOT } from "../../state.js";

type CapabilityDependencyConstitutionSummary = {
  readonly boundary_violations: number;
  readonly dependency_policy_violations: number;
  readonly api_runtime_violations: number;
  readonly consumer_mismatches: number;
};

type CapabilityGraphDependencyEdge = {
  readonly dependency_id: string;
  readonly dependency_class:
    | "bounded_context_capability"
    | "system_runtime"
    | "unknown_external";
  readonly resolution_status:
    | "RESOLVED_CAPABILITY"
    | "SYSTEM_DEPENDENCY"
    | "UNRESOLVED";
  readonly forbidden_dependency: boolean;
  readonly dependency_stability: string | null;
  readonly dependency_lifecycle_stage: string | null;
  readonly dependency_health:
    | "STABLE"
    | "SYSTEM_RUNTIME"
    | "UNKNOWN"
    | "REVIEW_REQUIRED";
  readonly rationale: string;
};

type CapabilityGraphNode = {
  readonly capability_id: string;
  readonly capability_version: string;
  readonly stability: string;
  readonly lifecycle_stage: string;
  readonly governance_status: string;
  readonly depends_on: readonly CapabilityGraphDependencyEdge[];
  readonly consumed_by: readonly string[];
};

type CapabilityGraphCycle = {
  readonly cycle_id: string;
  readonly path: readonly string[];
};

type CapabilityGraphCapabilityHealth = {
  readonly capability_id: string;
  readonly declared_dependency_count: number;
  readonly resolved_dependency_count: number;
  readonly system_dependency_count: number;
  readonly unknown_dependency_count: number;
  readonly forbidden_dependency_count: number;
  readonly unstable_dependency_count: number;
  readonly circular_dependency_count: number;
  readonly health_status: "PASS" | "WARN" | "FAIL";
  readonly health_rationale: readonly string[];
};

type CapabilityGraphHealthDomainStatus =
  | "PASS"
  | "WARN"
  | "FAIL"
  | "NOT_MATERIALIZED";

type CapabilityGraphObservationStatus =
  | "MATERIALIZED"
  | "PARTIAL"
  | "NOT_MATERIALIZED";

type CapabilityGraphHealthDomains = {
  readonly structural_health: {
    readonly status: CapabilityGraphHealthDomainStatus;
    readonly observation_status: CapabilityGraphObservationStatus;
    readonly circular_dependency_count: number;
    readonly unstable_dependency_count: number;
    readonly unknown_dependency_count: number;
    readonly orphan_capability_count: number;
  };
  readonly architectural_health: {
    readonly status: CapabilityGraphHealthDomainStatus;
    readonly observation_status: CapabilityGraphObservationStatus;
    readonly forbidden_dependency_count: number;
    readonly layering_violation_count: number;
    readonly abstraction_leak_count: number;
  };
  readonly governance_health: {
    readonly status: CapabilityGraphHealthDomainStatus;
    readonly observation_status: CapabilityGraphObservationStatus;
    readonly ownership_gap_count: number;
    readonly authority_conflict_count: null;
    readonly capability_ambiguity_count: null;
  };
  readonly evolution_health: {
    readonly status: CapabilityGraphHealthDomainStatus;
    readonly observation_status: CapabilityGraphObservationStatus;
    readonly deprecated_capability_count: number;
    readonly migration_debt_count: number;
    readonly superseded_capability_count: null;
  };
  readonly evidence_health: {
    readonly status: CapabilityGraphHealthDomainStatus;
    readonly observation_status: CapabilityGraphObservationStatus;
    readonly capability_without_evidence_count: number;
    readonly stale_evidence_count: number;
    readonly unverifiable_capability_count: number;
    readonly orphaned_evidence_count: number;
    readonly inconsistent_evidence_count: number;
    readonly unsigned_evidence_count: number;
    readonly tampered_evidence_count: number;
    readonly partial_evidence_count: number;
    readonly superseded_evidence_count: number;
    readonly expired_evidence_count: number;
  };
};

type CanonicalEvidenceArtifactLike = {
  readonly artifact_type: string;
  readonly schema_version: string;
  readonly generated_at_utc: string;
  readonly subject: {
    readonly subject_ref: string;
    readonly subject_type: string;
    readonly subject_digest: string | null;
  };
  readonly projection: {
    readonly projection_ref: string | null;
    readonly projection_id: string;
    readonly projection_type: string;
    readonly projection_digest: string;
  };
  readonly summary: Record<string, unknown>;
  readonly findings: readonly string[];
  readonly evidence: Record<string, unknown>;
  readonly digest: string;
  readonly signature: {
    readonly status: string;
    readonly key_id: string | null;
    readonly value: string | null;
    readonly reason: string;
  };
  readonly claim_boundary: string;
};

type EvidenceConvergencePolicy = {
  readonly validity_windows_hours?: Readonly<Record<string, number>>;
};

type QualityGatesPolicy = {
  readonly evidence_convergence?: EvidenceConvergencePolicy;
};

export type CapabilityGraphProjection = {
  readonly graph_version: "1.0.0";
  readonly graph_digest: string;
  readonly summary: {
    readonly capability_count: number;
    readonly dependency_edge_count: number;
    readonly resolved_dependency_count: number;
    readonly system_dependency_count: number;
    readonly unknown_dependency_count: number;
    readonly forbidden_dependency_count: number;
    readonly unstable_dependency_count: number;
    readonly circular_dependency_count: number;
    readonly pass_capability_count: number;
    readonly warn_capability_count: number;
    readonly fail_capability_count: number;
    readonly health_status: "PASS" | "FAIL";
    readonly governance_health_status: "PASS" | "WARN" | "FAIL";
  };
  readonly health_domains: CapabilityGraphHealthDomains;
  readonly capabilities: readonly CapabilityGraphNode[];
  readonly capability_health: readonly CapabilityGraphCapabilityHealth[];
  readonly cycles: readonly CapabilityGraphCycle[];
  readonly claim_boundary: string;
};

export type CapabilityGraphVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly graph_projection_status: "PASS" | "FAIL";
    readonly cycle_status: "PASS" | "FAIL";
    readonly forbidden_dependency_status: "PASS" | "FAIL";
    readonly unknown_dependency_status: "PASS" | "FAIL";
    readonly unstable_dependency_status: "PASS" | "FAIL";
    readonly health_status: "PASS" | "FAIL";
    readonly governance_health_status: "PASS" | "WARN" | "FAIL";
  };
  readonly health_domains: CapabilityGraphHealthDomains;
  readonly metrics: {
    readonly capability_count: number;
    readonly dependency_edge_count: number;
    readonly circular_dependency_count: number;
    readonly forbidden_dependency_count: number;
    readonly unknown_dependency_count: number;
    readonly unstable_dependency_count: number;
    readonly pass_capability_count: number;
    readonly warn_capability_count: number;
    readonly fail_capability_count: number;
  };
  readonly claim_boundary: string;
};

function isStableDependency(stability: string | null, lifecycleStage: string | null): boolean {
  return stability === "stable" && lifecycleStage === "active";
}

function classifyObservedHealthDomainStatus(input: {
  readonly failCount: number;
  readonly warnCount?: number;
}): "PASS" | "WARN" | "FAIL" {
  if (input.failCount > 0) {
    return "FAIL";
  }
  if ((input.warnCount ?? 0) > 0) {
    return "WARN";
  }
  return "PASS";
}

function resolveRepoPath(pathRef: string): string {
  return resolve(EOS_ROOT, pathRef);
}

function hasStaleVerificationEvidence(input: {
  readonly manifestRef: string;
  readonly verificationRef: string | null;
}): boolean {
  if (input.verificationRef === null) {
    return false;
  }

  const manifestPath = resolveRepoPath(input.manifestRef);
  const verificationPath = resolveRepoPath(input.verificationRef);
  if (!existsSync(manifestPath) || !existsSync(verificationPath)) {
    return false;
  }

  return (
    statSync(verificationPath).mtimeMs < statSync(manifestPath).mtimeMs
  );
}

function readCanonicalEvidenceArtifact(
  verificationRef: string | null,
): CanonicalEvidenceArtifactLike | null {
  if (verificationRef === null) {
    return null;
  }

  const verificationPath = resolveRepoPath(verificationRef);
  if (!existsSync(verificationPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(verificationPath, "utf8")) as unknown;
    if (!isCanonicalEvidenceArtifactLike(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isCanonicalEvidenceArtifactLike(
  value: unknown,
): value is CanonicalEvidenceArtifactLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const subject = record.subject;
  const projection = record.projection;
  const signature = record.signature;
  return (
    typeof record.artifact_type === "string" &&
    typeof record.schema_version === "string" &&
    typeof record.generated_at_utc === "string" &&
    typeof record.digest === "string" &&
    typeof record.claim_boundary === "string" &&
    Array.isArray(record.findings) &&
    typeof record.summary === "object" &&
    record.summary !== null &&
    typeof record.evidence === "object" &&
    record.evidence !== null &&
    typeof subject === "object" &&
    subject !== null &&
    typeof (subject as Record<string, unknown>).subject_ref === "string" &&
    typeof (subject as Record<string, unknown>).subject_type === "string" &&
    (typeof (subject as Record<string, unknown>).subject_digest === "string" ||
      (subject as Record<string, unknown>).subject_digest === null) &&
    typeof projection === "object" &&
    projection !== null &&
    typeof (projection as Record<string, unknown>).projection_id === "string" &&
    typeof (projection as Record<string, unknown>).projection_type === "string" &&
    typeof (projection as Record<string, unknown>).projection_digest === "string" &&
    (typeof (projection as Record<string, unknown>).projection_ref === "string" ||
      (projection as Record<string, unknown>).projection_ref === null) &&
    typeof signature === "object" &&
    signature !== null &&
    typeof (signature as Record<string, unknown>).status === "string" &&
    (typeof (signature as Record<string, unknown>).key_id === "string" ||
      (signature as Record<string, unknown>).key_id === null) &&
    (typeof (signature as Record<string, unknown>).value === "string" ||
      (signature as Record<string, unknown>).value === null) &&
    typeof (signature as Record<string, unknown>).reason === "string"
  );
}

function computeCanonicalEvidenceDigest(
  artifact: CanonicalEvidenceArtifactLike,
): string {
  return DigestEngine.digest({
    artifact_type: artifact.artifact_type,
    schema_version: artifact.schema_version,
    generated_at_utc: artifact.generated_at_utc,
    subject: artifact.subject,
    projection: artifact.projection,
    summary: artifact.summary,
    findings: artifact.findings,
    evidence: artifact.evidence,
    claim_boundary: artifact.claim_boundary,
  });
}

function readEvidenceConvergencePolicy(): EvidenceConvergencePolicy {
  const qualityGatesPath = resolve(
    EOS_ROOT,
    "enterprise/execution/QUALITY-GATES.yaml",
  );
  if (!existsSync(qualityGatesPath)) {
    return {};
  }

  const parsed = readYamlArtifact<QualityGatesPolicy>(qualityGatesPath);
  return parsed.evidence_convergence ?? {};
}

function resolveEvidenceValidityWindowHours(
  artifactType: string,
  policy: EvidenceConvergencePolicy,
): number | null {
  const windows = policy.validity_windows_hours;
  if (windows === undefined) {
    return null;
  }
  const artifactWindow = windows[artifactType];
  if (typeof artifactWindow === "number" && Number.isFinite(artifactWindow)) {
    return artifactWindow;
  }
  const defaultWindow = windows.default;
  return typeof defaultWindow === "number" && Number.isFinite(defaultWindow)
    ? defaultWindow
    : null;
}

function analyzeVerificationEvidence(input: {
  readonly capabilityId: string;
  readonly manifestRef: string;
  readonly verificationRef: string | null;
  readonly artifactDirectoryRef: string;
  readonly evidencePolicy: EvidenceConvergencePolicy;
  readonly nowUtc: string;
}): {
  readonly orphaned: boolean;
  readonly inconsistent: boolean;
  readonly unsigned: boolean;
  readonly tampered: boolean;
  readonly partial: boolean;
  readonly superseded: boolean;
  readonly expired: boolean;
} {
  const artifact = readCanonicalEvidenceArtifact(input.verificationRef);
  if (input.verificationRef === null || artifact === null) {
    return {
      orphaned: false,
      inconsistent: false,
      unsigned: false,
      tampered: false,
      partial: false,
      superseded: false,
      expired: false,
    };
  }

  const manifestPath = resolveRepoPath(input.manifestRef);
  const manifestDigest = existsSync(manifestPath)
    ? DigestEngine.digest(readFileSync(manifestPath, "utf8"))
    : null;
  const orphaned =
    artifact.subject.subject_ref !== input.manifestRef &&
    artifact.subject.subject_ref !== input.capabilityId;
  const inconsistent =
    manifestDigest !== null &&
    artifact.subject.subject_digest !== null &&
    artifact.subject.subject_digest !== manifestDigest;
  const unsigned =
    artifact.signature.status === "UNSIGNED" ||
    artifact.signature.value === null ||
    artifact.signature.key_id === null;
  const tampered = artifact.digest !== computeCanonicalEvidenceDigest(artifact);
  const superseded = hasSupersedingEvidence({
    artifactDirectoryRef: input.artifactDirectoryRef,
    currentVerificationRef: input.verificationRef,
    artifact,
  });
  const expired = isExpiredEvidence({
    artifact,
    evidencePolicy: input.evidencePolicy,
    nowUtc: input.nowUtc,
  });

  return {
    orphaned,
    inconsistent,
    unsigned,
    tampered,
    partial: false,
    superseded,
    expired,
  };
}

function isExpiredEvidence(input: {
  readonly artifact: CanonicalEvidenceArtifactLike;
  readonly evidencePolicy: EvidenceConvergencePolicy;
  readonly nowUtc: string;
}): boolean {
  const validityWindowHours = resolveEvidenceValidityWindowHours(
    input.artifact.artifact_type,
    input.evidencePolicy,
  );
  if (validityWindowHours === null) {
    return false;
  }

  const generatedAtMs = Date.parse(input.artifact.generated_at_utc);
  const nowMs = Date.parse(input.nowUtc);
  if (!Number.isFinite(generatedAtMs) || !Number.isFinite(nowMs)) {
    return false;
  }

  return nowMs - generatedAtMs > validityWindowHours * 60 * 60 * 1000;
}

function hasSupersedingEvidence(input: {
  readonly artifactDirectoryRef: string;
  readonly currentVerificationRef: string;
  readonly artifact: CanonicalEvidenceArtifactLike;
}): boolean {
  const artifactDirectoryPath = resolveRepoPath(input.artifactDirectoryRef);
  if (!existsSync(artifactDirectoryPath)) {
    return false;
  }

  const currentTimestamp = Date.parse(input.artifact.generated_at_utc);
  if (!Number.isFinite(currentTimestamp)) {
    return false;
  }

  const currentClaimKey = buildEvidenceClaimKey(input.artifact);
  for (const entry of readdirSync(artifactDirectoryPath, {
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }
    const candidateRef = `${input.artifactDirectoryRef}/${entry.name}`;
    if (candidateRef === input.currentVerificationRef) {
      continue;
    }
    const candidateArtifact = readCanonicalEvidenceArtifact(candidateRef);
    if (candidateArtifact === null) {
      continue;
    }
    if (buildEvidenceClaimKey(candidateArtifact) !== currentClaimKey) {
      continue;
    }
    const candidateTimestamp = Date.parse(candidateArtifact.generated_at_utc);
    if (!Number.isFinite(candidateTimestamp)) {
      continue;
    }
    if (
      candidateTimestamp > currentTimestamp &&
      candidateArtifact.digest !== input.artifact.digest
    ) {
      return true;
    }
  }

  return false;
}

function buildEvidenceClaimKey(artifact: CanonicalEvidenceArtifactLike): string {
  return [
    artifact.artifact_type,
    artifact.subject.subject_type,
    artifact.subject.subject_ref,
    artifact.projection.projection_type,
  ].join("|");
}

function collectCycles(nodes: readonly CapabilityGraphNode[]): readonly CapabilityGraphCycle[] {
  const adjacency = new Map(
    nodes.map((node) => [
      node.capability_id,
      node.depends_on
        .filter((edge) => edge.dependency_class === "bounded_context_capability")
        .map((edge) => edge.dependency_id),
    ]),
  );
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const cycleKeys = new Set<string>();
  const cycles: CapabilityGraphCycle[] = [];

  const visit = (capabilityId: string): void => {
    visited.add(capabilityId);
    active.add(capabilityId);
    stack.push(capabilityId);

    for (const dependencyId of adjacency.get(capabilityId) ?? []) {
      if (!visited.has(dependencyId)) {
        visit(dependencyId);
        continue;
      }
      if (!active.has(dependencyId)) {
        continue;
      }
      const startIndex = stack.indexOf(dependencyId);
      if (startIndex === -1) {
        continue;
      }
      const cyclePath = [...stack.slice(startIndex), dependencyId];
      const cycleKey = cyclePath.join("->");
      if (cycleKeys.has(cycleKey)) {
        continue;
      }
      cycleKeys.add(cycleKey);
      cycles.push({
        cycle_id: `capability-cycle:${DigestEngine.digest(cyclePath).slice(0, 16)}`,
        path: cyclePath,
      });
    }

    stack.pop();
    active.delete(capabilityId);
  };

  for (const node of nodes) {
    if (!visited.has(node.capability_id)) {
      visit(node.capability_id);
    }
  }

  return cycles.sort((left, right) => left.cycle_id.localeCompare(right.cycle_id));
}

export function materializeCapabilityGraphProjection(input: {
  readonly capabilityGovernance: CapabilityGovernanceProjection;
  readonly dependencyConstitutionSummary: CapabilityDependencyConstitutionSummary;
  readonly nowUtc?: string;
}): {
  readonly graph: CapabilityGraphProjection;
  readonly verification: CapabilityGraphVerificationReport;
} {
  const evidencePolicy = readEvidenceConvergencePolicy();
  const nowUtc = input.nowUtc ?? new Date().toISOString();
  const capabilityById = new Map(
    input.capabilityGovernance.capabilities.map((capability) => [
      capability.capability_id,
      capability,
    ]),
  );

  const graphCapabilities = input.capabilityGovernance.capabilities
    .map((capability) => ({
      capability_id: capability.capability_id,
      capability_version: capability.version.capability_version,
      stability: capability.version.stability,
      lifecycle_stage: capability.version.lifecycle_stage,
      governance_status: capability.manifest.governance_status,
      depends_on: capability.dependencies.dependency_classification.entries.map(
        (entry) => {
          const dependency = capabilityById.get(entry.dependency_id);
          const dependencyStability = dependency?.version.stability ?? null;
          const dependencyLifecycleStage =
            dependency?.version.lifecycle_stage ?? null;
          return {
            dependency_id: entry.dependency_id,
            dependency_class: entry.dependency_class,
            resolution_status: entry.resolution_status,
            forbidden_dependency:
              capability.dependencies.dependency_policy.forbidden_dependencies.includes(
                entry.dependency_id,
              ),
            dependency_stability: dependencyStability,
            dependency_lifecycle_stage: dependencyLifecycleStage,
            dependency_health:
              entry.dependency_class === "system_runtime"
                ? ("SYSTEM_RUNTIME" as const)
                : entry.dependency_class === "unknown_external"
                  ? ("UNKNOWN" as const)
                  : isStableDependency(
                        dependencyStability,
                        dependencyLifecycleStage,
                      )
                    ? ("STABLE" as const)
                    : ("REVIEW_REQUIRED" as const),
            rationale: entry.rationale,
          };
        },
      ),
      consumed_by: capability.dependencies.consumers,
    }))
    .sort((left, right) => left.capability_id.localeCompare(right.capability_id));

  const cycles = collectCycles(graphCapabilities);
  const dependencyEdges = graphCapabilities.flatMap((capability) =>
    capability.depends_on.map((edge) => ({
      capability_id: capability.capability_id,
      ...edge,
    })),
  );
  const forbiddenDependencyCount = dependencyEdges.filter(
    (edge) => edge.forbidden_dependency,
  ).length;
  const unknownDependencyCount = dependencyEdges.filter(
    (edge) => edge.dependency_class === "unknown_external",
  ).length;
  const systemDependencyCount = dependencyEdges.filter(
    (edge) => edge.dependency_class === "system_runtime",
  ).length;
  const resolvedDependencyCount = dependencyEdges.filter(
    (edge) => edge.resolution_status === "RESOLVED_CAPABILITY",
  ).length;
  const unstableDependencyCount = dependencyEdges.filter(
    (edge) => edge.dependency_health === "REVIEW_REQUIRED",
  ).length;
  const ownershipGapCount = input.capabilityGovernance.capabilities.filter(
    (capability) =>
      capability.manifest.owner_requirement_status !== "PASS" ||
      capability.manifest.owner === null,
  ).length;
  const deprecatedCapabilityCount = input.capabilityGovernance.capabilities.filter(
    (capability) =>
      capability.version.lifecycle_stage === "deprecated" ||
      capability.version.deprecated !== null,
  ).length;
  const layeringViolationCount =
    input.dependencyConstitutionSummary.boundary_violations +
    input.dependencyConstitutionSummary.dependency_policy_violations;
  const abstractionLeakCount =
    input.dependencyConstitutionSummary.api_runtime_violations +
    input.dependencyConstitutionSummary.consumer_mismatches;
  const orphanCapabilityCount = input.capabilityGovernance.capabilities.filter(
    (capability) => capability.dependencies.reachability_status === "UNREACHABLE",
  ).length;
  const capabilityWithoutEvidenceCount = input.capabilityGovernance.capabilities.filter(
    (capability) => capability.manifest.verification_ref === null,
  ).length;
  const staleEvidenceCount = input.capabilityGovernance.capabilities.filter(
    (capability) =>
      hasStaleVerificationEvidence({
        manifestRef: capability.manifest.manifest_ref,
        verificationRef: capability.manifest.verification_ref,
      }),
  ).length;
  const unverifiableCapabilityCount = input.capabilityGovernance.capabilities.filter(
    (capability) =>
      capability.dependencies.reachability_status === "UNREACHABLE" &&
      capability.manifest.verification_ref === null,
  ).length;
  const migrationDebtCount =
    input.capabilityGovernance.verification.summary.migration_required_count;
  const evidenceDiagnostics = input.capabilityGovernance.capabilities.map(
    (capability) => {
      const artifactDirectoryRef =
        input.capabilityGovernance.index.capabilities.find(
          (entry) => entry.capability_id === capability.capability_id,
        )?.artifact_directory ?? "workspace/foundation/evidence/verification";
      return (
      analyzeVerificationEvidence({
        capabilityId: capability.capability_id,
        manifestRef: capability.manifest.manifest_ref,
        verificationRef: capability.manifest.verification_ref,
        artifactDirectoryRef,
          evidencePolicy,
          nowUtc,
      })
      );
    },
  );
  const orphanedEvidenceCount = evidenceDiagnostics.filter(
    (diagnostic) => diagnostic.orphaned,
  ).length;
  const inconsistentEvidenceCount = evidenceDiagnostics.filter(
    (diagnostic) => diagnostic.inconsistent,
  ).length;
  const unsignedEvidenceCount = evidenceDiagnostics.filter(
    (diagnostic) => diagnostic.unsigned,
  ).length;
  const tamperedEvidenceCount = evidenceDiagnostics.filter(
    (diagnostic) => diagnostic.tampered,
  ).length;
  const supersededEvidenceCount = evidenceDiagnostics.filter(
    (diagnostic) => diagnostic.superseded,
  ).length;
  const expiredEvidenceCount = evidenceDiagnostics.filter(
    (diagnostic) => diagnostic.expired,
  ).length;
  const partialEvidenceCount = input.capabilityGovernance.capabilities.filter(
    (capability) => {
      if (capability.manifest.verification_ref === null) {
        return false;
      }
      const verificationPath = resolveRepoPath(capability.manifest.verification_ref);
      return existsSync(verificationPath)
        ? readCanonicalEvidenceArtifact(capability.manifest.verification_ref) === null
        : false;
    },
  ).length;
  const capabilityHealth = graphCapabilities
    .map((capability) => {
      const declaredDependencyCount = capability.depends_on.length;
      const resolvedDependencyCount = capability.depends_on.filter(
        (edge) => edge.resolution_status !== "UNRESOLVED",
      ).length;
      const systemDependencyCount = capability.depends_on.filter(
        (edge) => edge.dependency_class === "system_runtime",
      ).length;
      const unknownCount = capability.depends_on.filter(
        (edge) => edge.dependency_class === "unknown_external",
      ).length;
      const forbiddenCount = capability.depends_on.filter(
        (edge) => edge.forbidden_dependency,
      ).length;
      const unstableCount = capability.depends_on.filter(
        (edge) => edge.dependency_health === "REVIEW_REQUIRED",
      ).length;
      const circularCount = cycles.filter((cycle) =>
        cycle.path.includes(capability.capability_id),
      ).length;
      const healthStatus =
        circularCount > 0 || forbiddenCount > 0 || unknownCount > 0
          ? ("FAIL" as const)
          : unstableCount > 0
            ? ("WARN" as const)
            : ("PASS" as const);
      const healthRationale =
        healthStatus === "FAIL"
          ? [
              ...(circularCount > 0
                ? [`Detected ${String(circularCount)} circular dependency path(s).`]
                : []),
              ...(forbiddenCount > 0
                ? [`Detected ${String(forbiddenCount)} forbidden dependency edge(s).`]
                : []),
              ...(unknownCount > 0
                ? [`Detected ${String(unknownCount)} unknown dependency edge(s).`]
                : []),
            ]
          : healthStatus === "WARN"
            ? [
                `Detected ${String(
                  unstableCount,
                )} dependency edge(s) targeting capability contracts that are not yet stable and active.`,
              ]
            : [
                "All declared dependencies are resolved with no cycles, forbidden edges, or unknown external drift.",
              ];

      return {
        capability_id: capability.capability_id,
        declared_dependency_count: declaredDependencyCount,
        resolved_dependency_count: resolvedDependencyCount,
        system_dependency_count: systemDependencyCount,
        unknown_dependency_count: unknownCount,
        forbidden_dependency_count: forbiddenCount,
        unstable_dependency_count: unstableCount,
        circular_dependency_count: circularCount,
        health_status: healthStatus,
        health_rationale: healthRationale,
      };
    })
    .sort((left, right) => left.capability_id.localeCompare(right.capability_id));
  const passCapabilityCount = capabilityHealth.filter(
    (capability) => capability.health_status === "PASS",
  ).length;
  const warnCapabilityCount = capabilityHealth.filter(
    (capability) => capability.health_status === "WARN",
  ).length;
  const failCapabilityCount = capabilityHealth.filter(
    (capability) => capability.health_status === "FAIL",
  ).length;
  const healthDomains: CapabilityGraphHealthDomains = {
    structural_health: {
      status: classifyObservedHealthDomainStatus({
        failCount: cycles.length + unknownDependencyCount,
        warnCount: unstableDependencyCount + orphanCapabilityCount,
      }),
      observation_status: "PARTIAL",
      circular_dependency_count: cycles.length,
      unstable_dependency_count: unstableDependencyCount,
      unknown_dependency_count: unknownDependencyCount,
      orphan_capability_count: orphanCapabilityCount,
    },
    architectural_health: {
      status: classifyObservedHealthDomainStatus({
        failCount:
          forbiddenDependencyCount + layeringViolationCount + abstractionLeakCount,
      }),
        observation_status: "MATERIALIZED",
      forbidden_dependency_count: forbiddenDependencyCount,
        layering_violation_count: layeringViolationCount,
        abstraction_leak_count: abstractionLeakCount,
    },
    governance_health: {
      status: classifyObservedHealthDomainStatus({
        failCount: 0,
        warnCount: ownershipGapCount,
      }),
      observation_status: "PARTIAL",
      ownership_gap_count: ownershipGapCount,
      authority_conflict_count: null,
      capability_ambiguity_count: null,
    },
    evolution_health: {
      status: classifyObservedHealthDomainStatus({
        failCount: 0,
        warnCount: deprecatedCapabilityCount + migrationDebtCount,
      }),
      observation_status: "PARTIAL",
      deprecated_capability_count: deprecatedCapabilityCount,
      migration_debt_count: migrationDebtCount,
      superseded_capability_count: null,
    },
    evidence_health: {
      status: classifyObservedHealthDomainStatus({
        failCount: 0,
        warnCount:
          capabilityWithoutEvidenceCount +
          staleEvidenceCount +
          unverifiableCapabilityCount +
          orphanedEvidenceCount +
          inconsistentEvidenceCount +
          unsignedEvidenceCount +
          tamperedEvidenceCount +
          supersededEvidenceCount +
          expiredEvidenceCount +
          partialEvidenceCount,
      }),
      observation_status: "PARTIAL",
      capability_without_evidence_count: capabilityWithoutEvidenceCount,
      stale_evidence_count: staleEvidenceCount,
      unverifiable_capability_count: unverifiableCapabilityCount,
      orphaned_evidence_count: orphanedEvidenceCount,
      inconsistent_evidence_count: inconsistentEvidenceCount,
      unsigned_evidence_count: unsignedEvidenceCount,
      tampered_evidence_count: tamperedEvidenceCount,
      partial_evidence_count: partialEvidenceCount,
      superseded_evidence_count: supersededEvidenceCount,
      expired_evidence_count: expiredEvidenceCount,
    },
  };
  const domainStatuses = [
    healthDomains.structural_health.status,
    healthDomains.architectural_health.status,
    healthDomains.governance_health.status,
    healthDomains.evolution_health.status,
    healthDomains.evidence_health.status,
  ];
  const governanceHealthStatus =
    domainStatuses.includes("FAIL")
      ? ("FAIL" as const)
      : domainStatuses.includes("WARN")
        ? ("WARN" as const)
        : failCapabilityCount > 0
          ? ("FAIL" as const)
          : warnCapabilityCount > 0
            ? ("WARN" as const)
            : ("PASS" as const);

  const graphSummary = {
    capability_count: graphCapabilities.length,
    dependency_edge_count: dependencyEdges.length,
    resolved_dependency_count: resolvedDependencyCount,
    system_dependency_count: systemDependencyCount,
    unknown_dependency_count: unknownDependencyCount,
    forbidden_dependency_count: forbiddenDependencyCount,
    unstable_dependency_count: unstableDependencyCount,
    circular_dependency_count: cycles.length,
    pass_capability_count: passCapabilityCount,
    warn_capability_count: warnCapabilityCount,
    fail_capability_count: failCapabilityCount,
    health_status:
      cycles.length === 0 &&
      forbiddenDependencyCount === 0 &&
      unknownDependencyCount === 0
        ? ("PASS" as const)
        : ("FAIL" as const),
    governance_health_status: governanceHealthStatus,
  };
  const graphPayload = {
    summary: graphSummary,
    health_domains: healthDomains,
    capabilities: graphCapabilities,
    capability_health: capabilityHealth,
    cycles,
  };
  const graph: CapabilityGraphProjection = {
    graph_version: "1.0.0",
    graph_digest: DigestEngine.digest(graphPayload),
    ...graphPayload,
    claim_boundary:
      "Capability graph projection turns manifest-level dependency intent into a governed graph artifact so cycles, forbidden edges, and unstable coupling can be audited without reading raw repository manifests.",
  };

  const verificationSummary = {
    graph_projection_status:
      graphSummary.capability_count ===
      input.capabilityGovernance.index.summary.capability_count
        ? ("PASS" as const)
        : ("FAIL" as const),
    cycle_status: cycles.length === 0 ? ("PASS" as const) : ("FAIL" as const),
    forbidden_dependency_status:
      forbiddenDependencyCount === 0 ? ("PASS" as const) : ("FAIL" as const),
    unknown_dependency_status:
      unknownDependencyCount === 0 ? ("PASS" as const) : ("FAIL" as const),
    unstable_dependency_status:
      unstableDependencyCount === 0 ? ("PASS" as const) : ("FAIL" as const),
    health_status: graphSummary.health_status,
    governance_health_status: graphSummary.governance_health_status,
  };
  const verificationPayload = {
    summary: verificationSummary,
    health_domains: healthDomains,
    metrics: {
      capability_count: graphSummary.capability_count,
      dependency_edge_count: graphSummary.dependency_edge_count,
      circular_dependency_count: graphSummary.circular_dependency_count,
      forbidden_dependency_count: graphSummary.forbidden_dependency_count,
      unknown_dependency_count: graphSummary.unknown_dependency_count,
      unstable_dependency_count: graphSummary.unstable_dependency_count,
      pass_capability_count: graphSummary.pass_capability_count,
      warn_capability_count: graphSummary.warn_capability_count,
      fail_capability_count: graphSummary.fail_capability_count,
    },
  };
  const verification: CapabilityGraphVerificationReport = {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(verificationPayload),
    ...verificationPayload,
    claim_boundary:
      "Capability graph verification proves that the projected dependency graph is explicit and can be audited for cycles, forbidden edges, unknown dependencies, and unstable coupling before capability evolution is trusted.",
  };

  return {
    graph,
    verification,
  };
}
