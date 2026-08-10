import fs from "fs";
import path from "path";

const PREDICATE_VERSION = "requirement-verification-predicate/0.2.0";

type DecisionVerdict = "passed" | "failed";



export interface DecisionEvidenceDigestIntegrity {
  readonly digestChecks: number;
  readonly digestFailures: readonly string[];
  readonly decisionIntegrityFailures: readonly string[];
  readonly allIntegrityPass: boolean;
  readonly evidenceWithDigests: number;
  readonly evidenceChecked: number;
}

export interface DecisionEvidenceRecord {
  readonly id: string;
  readonly kind: string;
  readonly path: string;
  readonly requirementRefs: readonly string[];
  readonly runId?: string;
  readonly contentHash: string;
  readonly digestIntegrity?: DecisionEvidenceDigestIntegrity;
}

function checkDigestIntegrity(
  absolutePath: string,
  decisionGetById: (id: string) => { readonly decision_digest?: string } | undefined,
): DecisionEvidenceDigestIntegrity {
  const digestFailures: string[] = [];
  const decisionIntegrityFailures: string[] = [];
  let digestChecks = 0;
  let evidenceWithDigests = 0;
  let evidenceChecked = 0;

  if (!absolutePath.endsWith(".json") && !absolutePath.endsWith(".jsonl")) {
    return {
      digestChecks: 0,
      digestFailures: [],
      decisionIntegrityFailures: [],
      allIntegrityPass: true,
      evidenceWithDigests: 0,
      evidenceChecked: 0,
    };
  }

  try {
    const raw = fs.readFileSync(absolutePath, "utf8").trim();
    if (raw.length === 0) {
      return {
        digestChecks: 0,
        digestFailures: [],
        decisionIntegrityFailures: [],
        allIntegrityPass: true,
        evidenceWithDigests: 0,
        evidenceChecked: 0,
      };
    }
    evidenceChecked = 1;
    const entries: Record<string, unknown>[] = [];
    if (absolutePath.endsWith(".jsonl")) {
      for (const line of raw.split(/\r?\n/g)) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          entries.push(JSON.parse(trimmed) as Record<string, unknown>);
        } catch {
          // skip malformed
        }
      }
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && typeof item === "object") entries.push(item);
            }
          } else {
            entries.push(parsed);
          }
        }
      } catch {
        // not parseable
      }
    }

    for (const runtimeEntry of entries) {
      let hadDigest = false;
      if (
        typeof (runtimeEntry as any).input !== "undefined" &&
        typeof (runtimeEntry as any).input_digest === "string"
      ) {
        hadDigest = true;
        digestChecks++;
        const recomputed = DigestEngine.digest((runtimeEntry as any).input);
        if (recomputed !== (runtimeEntry as any).input_digest) {
          digestFailures.push(`input_digest mismatch`);
        }
      }
      if (
        typeof (runtimeEntry as any).result !== "undefined" &&
        typeof (runtimeEntry as any).result_digest === "string"
      ) {
        hadDigest = true;
        digestChecks++;
        const recomputed = DigestEngine.digest((runtimeEntry as any).result);
        if (recomputed !== (runtimeEntry as any).result_digest) {
          digestFailures.push(`result_digest mismatch`);
        }
      }
      if (typeof (runtimeEntry as any).invocation_digest === "string") {
        hadDigest = true;
        digestChecks++;
        const rec = { ...runtimeEntry };
        delete (rec as any).invocation_digest;
        const recomputed = DigestEngine.digest(rec);
        if (recomputed !== (runtimeEntry as any).invocation_digest) {
          decisionIntegrityFailures.push(
            `decision_digest tamper:${(runtimeEntry as any).decision_id}`,
          );
        }
      }
      if (typeof (runtimeEntry as any).decision_id === "string") {
        const decision = decisionGetById((runtimeEntry as any).decision_id);
        if (decision && typeof decision.decision_digest === "string") {
          hadDigest = true;
          digestChecks++;
          const rec = { ...(decision as Record<string, unknown>) };
          delete rec.decision_digest;
          const recomputed = DigestEngine.digest(rec);
          if (recomputed !== decision.decision_digest) {
            decisionIntegrityFailures.push(
              `decision_digest tamper:${(runtimeEntry as any).decision_id}`,
            );
          }
        }
      }
      if (hadDigest) evidenceWithDigests++;
    }
  } catch {
    // Ignore unreadable files
  }

  return {
    digestChecks,
    digestFailures,
    decisionIntegrityFailures,
    allIntegrityPass: digestFailures.length === 0 && decisionIntegrityFailures.length === 0,
    evidenceWithDigests,
    evidenceChecked,
  };
}

function stableRequirementFacts(requirement: RequirementAggregate) {
  return {
    id: requirement.id,
    title: requirement.title,
    summary: requirement.summary ?? null,
    description: requirement.description ?? null,
    priority: requirement.priority,
    owner: requirement.owner ?? null,
    source: requirement.source ?? null,
    linkedCapabilityIds: [...requirement.linkedCapabilityIds].sort((left, right) =>
      left.localeCompare(right),
    ),
    acceptanceCriteria: [...requirement.acceptanceCriteria],
    createdAt: requirement.createdAt.toISOString(),
    approvedAt: requirement.approvedAt?.toISOString() ?? null,
    implementedAt: requirement.implementedAt?.toISOString() ?? null,
  } as const;
}

function resolveWorkspaceRoot(): string {
  const candidates = [
    process.cwd(),
    "/app",
    "/root/Enterprise-OS/workspace",
    path.resolve(process.cwd(), ".."),
  ];

  for (const candidate of Array.from(new Set(candidates))) {
    const hasWorkspaceShape =
      fs.existsSync(path.join(candidate, "apps")) &&
      fs.existsSync(path.join(candidate, "package.json"));

    if (hasWorkspaceShape) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve workspace root for verification decision.");
}

function resolveEvidenceAbsolutePath(relativePath: string): string {
  const evidenceRoot = process.env.EOS_EVIDENCE_STORAGE_ROOT?.trim();
  const candidates = [
    evidenceRoot ? path.join(evidenceRoot, relativePath) : undefined,
    path.join(resolveWorkspaceRoot(), relativePath),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve evidence artifact path: ${relativePath}`);
}

function toRequirementRef(requirementId: string): string {
  return requirementId.trim().toUpperCase();
}

function buildEvidenceSet(requirementId: string): readonly DecisionEvidenceRecord[] {
  return evidenceRegistryService
    .searchEvidenceRegistry({
      requirementRef: toRequirementRef(requirementId),
      limit: 200,
      offset: 0,
    })
    .items.map((record) => {
      const absolutePath = resolveEvidenceAbsolutePath(record.path);
      const contentHash = DigestEngine.digestText(fs.readFileSync(absolutePath, "utf8"));
      return {
        id: record.id,
        kind: record.kind,
        path: record.path,
        requirementRefs: [...record.requirementRefs].sort((left, right) => left.localeCompare(right)),
        ...(record.runId ? { runId: record.runId } : {}),
        contentHash,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

export interface VerificationDecisionSnapshot {
  readonly requirementId: string;
  readonly predicateVersion: string;
  readonly verdict: DecisionVerdict;
  readonly consultedPersistedVerificationState: false;
  readonly lifecycleEligible: boolean;
  readonly requirementHash: string;
  readonly evidenceSetHash: string;
  readonly registryProjectionHash: string;
  readonly decisionInputHash: string;
  readonly decisionFingerprint: string;
  readonly requirementFacts: ReturnType<typeof stableRequirementFacts>;
  readonly evidenceSet: readonly DecisionEvidenceRecord[];
  readonly registryProjection: {
    readonly traceabilityComplete: boolean;
    readonly artifactCount: number;
    readonly evidenceArtifactCount: number;
    readonly verificationArtifactCount: number;
    readonly gaps: readonly string[];
    readonly evidenceMatchedCount: number;
    readonly evidenceRequirementRefs: readonly string[];
    readonly evidenceSamplePaths: readonly string[];
    readonly kindBreakdown: Readonly<Record<string, number>>;
  };
}

export function computeVerificationDecision(requirementId: string): VerificationDecisionSnapshot {
  const requirement = requirementService.getRequirement({
    id: RequirementId(requirementId),
  });

  if (!requirement) {
    throw new Error(`Requirement not found: ${requirementId}`);
  }

  const delivery = requirementDeliveryGatewayService.search({
    requirementId,
    coverage: "all",
    limit: 1,
    offset: 0,
  }).items[0];

  if (!delivery) {
    throw new Error(`Delivery context not found: ${requirementId}`);
  }

  const requirementFacts = stableRequirementFacts(requirement);
  const evidenceSet = buildEvidenceSet(requirementId);
  const registryProjection = {
    traceabilityComplete: delivery.traceability.complete,
    artifactCount: delivery.traceability.artifactCount,
    evidenceArtifactCount: delivery.traceability.evidenceArtifactCount,
    verificationArtifactCount: delivery.traceability.verificationArtifactCount,
    gaps: [...delivery.traceability.gaps],
    evidenceMatchedCount: delivery.evidence.matchedCount,
    evidenceRequirementRefs: [...delivery.evidence.requirementRefs].sort((left, right) =>
      left.localeCompare(right),
    ),
    evidenceSamplePaths: [...delivery.evidence.samplePaths].sort((left, right) =>
      left.localeCompare(right),
    ),
    kindBreakdown: Object.fromEntries(
      Object.entries(delivery.evidence.kindBreakdown).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  } as const;

  const lifecycleEligible = requirement.implementedAt !== undefined;
  const requirementHash = DigestEngine.digest(requirementFacts);
  const evidenceSetHash = DigestEngine.digest(evidenceSet);
  const registryProjectionHash = DigestEngine.digest(registryProjection);

  const decisionInput = {
    predicateVersion: PREDICATE_VERSION,
    requirementHash,
    evidenceSetHash,
    registryProjectionHash,
    lifecycleEligible,
  } as const;
  const decisionInputHash = DigestEngine.digest(decisionInput);

  const verdict: DecisionVerdict =
    lifecycleEligible &&
    registryProjection.traceabilityComplete &&
    registryProjection.evidenceMatchedCount > 0
      ? "passed"
      : "failed";

  const decisionFingerprint = DigestEngine.digest({
    ...decisionInput,
    verdict,
  });

  return {
    requirementId,
    predicateVersion: PREDICATE_VERSION,
    verdict,
    consultedPersistedVerificationState: false,
    lifecycleEligible,
    requirementHash,
    evidenceSetHash,
    registryProjectionHash,
    decisionInputHash,
    decisionFingerprint,
    requirementFacts,
    evidenceSet,
    registryProjection,
  };
}