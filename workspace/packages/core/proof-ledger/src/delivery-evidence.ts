import fs from "fs";
import path from "path";
import { WorkspaceSession, DigestEngine } from "@repo/core-kernel";

interface ProductContext {
  readonly productDomain: string;
  readonly requestHost: string;
}

interface DeliveryEvidenceRequirement {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  readonly owner?: string;
  readonly status: string;
  readonly verificationStatus: string;
  readonly priority: string;
  readonly linkedCapabilityIds: readonly string[];
  readonly acceptanceCriteria: readonly string[];
}

interface DeliveryEvidenceInput {
  readonly productId: string;
  readonly productContext: ProductContext;
  readonly session: WorkspaceSession;
  readonly requirement: DeliveryEvidenceRequirement;
  readonly workflow: {
    readonly status: string;
    readonly output: {
      readonly readyForWorkflow?: boolean;
      readonly evidenceCount?: number;
      readonly traceabilityGapCount?: number;
    };
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

export interface PersistedDeliveryEvidence {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly requirementRef: string;
  readonly runId: string;
  readonly digest: string;
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
      fs.existsSync(path.join(candidate, "package.json")) &&
      fs.existsSync(path.join(candidate, "products"));

    if (hasWorkspaceShape) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve workspace root for delivery evidence.");
}

function resolveEvidenceStorageRoot(): string {
  const raw = process.env.EOS_EVIDENCE_STORAGE_ROOT?.trim();
  if (raw && raw.length > 0) {
    return raw;
  }
  return resolveWorkspaceRoot();
}

export function toRequirementRef(requirementId: string): string {
  return requirementId.trim().toUpperCase();
}

export function persistDeliveryEvidenceArtifact(
  input: DeliveryEvidenceInput,
): PersistedDeliveryEvidence {
  const storageRoot = resolveEvidenceStorageRoot();
  const generatedAtUtc = new Date().toISOString();
  const requirementRef = toRequirementRef(input.requirement.id);
  const runId = `run-${input.requirement.id}`;
  const relativePath = path.join(
    "products",
    input.productId,
    "evidence",
    "delivery",
    requirementRef,
    runId,
    "delivery-execution-evidence.json",
  );
  const absolutePath = path.join(storageRoot, relativePath);

  const envelope = {
    schema_version: "1.0.0",
    artifact_type: "delivery-execution-evidence",
    generated_at_utc: generatedAtUtc,
    product: {
      product_id: input.productId,
      product_domain: input.productContext.productDomain,
      request_host: input.productContext.requestHost,
    },
    requirement: {
      requirement_id: input.requirement.id,
      requirement_ref: requirementRef,
      title: input.requirement.title,
      summary: input.requirement.summary ?? null,
      owner: input.requirement.owner ?? null,
      status: input.requirement.status,
      verification_status: input.requirement.verificationStatus,
      priority: input.requirement.priority,
      linked_capability_ids: [...input.requirement.linkedCapabilityIds],
      acceptance_criteria: [...input.requirement.acceptanceCriteria],
    },
    delivery_context: {
      workflow_status: input.workflow.status,
      ready_for_workflow: input.workflow.output.readyForWorkflow ?? false,
      evidence_count_before_attach: input.workflow.output.evidenceCount ?? 0,
      traceability_gap_count: input.workflow.output.traceabilityGapCount ?? 0,
      traceability_complete: input.delivery?.traceability.complete ?? false,
      traceability_gaps: [...(input.delivery?.traceability.gaps ?? [])],
      traceability_artifact_count: input.delivery?.traceability.artifactCount ?? 0,
      verification_artifact_count: input.delivery?.traceability.verificationArtifactCount ?? 0,
    },
    operator: {
      actor_id: input.session.actorId,
      actor_label: input.session.actorLabel,
      tenant_id: input.session.tenantId,
      workspace_id: input.session.workspaceId,
    },
    claim_boundary:
      "Delivery execution evidence claims only the observed public runtime delivery context captured for this requirement at generation time.",
  };

  const envelopeString = JSON.stringify(envelope, null, 2);
  const digest = DigestEngine.digestText(envelopeString);
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, envelopeString, "utf8");

  return {
    absolutePath,
    relativePath,
    requirementRef,
    runId,
    digest,
  };
}