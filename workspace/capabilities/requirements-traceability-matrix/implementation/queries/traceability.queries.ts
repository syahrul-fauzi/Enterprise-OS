import { RequirementId, type RequirementAggregate } from "../../../requirement-management/implementation/contracts";
import { requirementService } from "../../../requirement-management/implementation/service";
import type {
  GetTraceabilityRowInput,
  GetTraceabilityRowOutput,
  RequirementTraceabilityCoverage,
  RequirementTraceabilityLink,
  RequirementTraceabilityRow,
  SearchTraceabilityMatrixInput,
  SearchTraceabilityMatrixOutput,
  TraceabilityArtifact,
  TraceabilityArtifactKind,
  TraceabilityMatrixSummary,
  TraceabilityMatchReason,
} from "../contracts";
import { TraceabilityArtifactRepositoryInMemory } from "../repository";

const DELIVERY_ARTIFACT_KINDS = new Set<TraceabilityArtifactKind>([
  "capability",
  "api",
  "source",
]);

function intersect(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function sortLinks(links: readonly RequirementTraceabilityLink[]): readonly RequirementTraceabilityLink[] {
  return [...links].sort((left, right) => {
    if (left.kind === right.kind) {
      return left.reference.localeCompare(right.reference);
    }
    return left.kind.localeCompare(right.kind);
  });
}

function toLink(
  artifact: TraceabilityArtifact,
  requirement: RequirementAggregate,
): RequirementTraceabilityLink | undefined {
  const matchedBy: TraceabilityMatchReason[] = [];
  if (artifact.requirementIds.includes(requirement.id)) {
    matchedBy.push("requirement_id");
  }
  if (intersect(artifact.linkedCapabilityIds, requirement.linkedCapabilityIds)) {
    matchedBy.push("linked_capability");
  }
  if (matchedBy.length === 0) {
    return undefined;
  }
  return {
    ...artifact,
    matchedBy,
    requirementIds: [...artifact.requirementIds],
    linkedCapabilityIds: [...artifact.linkedCapabilityIds],
    ...(artifact.externalRequirementRefs !== undefined
      ? { externalRequirementRefs: [...artifact.externalRequirementRefs] }
      : {}),
  };
}

function buildCoverage(
  requirement: RequirementAggregate,
  links: readonly RequirementTraceabilityLink[],
): RequirementTraceabilityCoverage {
  const hasDeliveryArtifacts = links.some((link) => DELIVERY_ARTIFACT_KINDS.has(link.kind));
  const hasVerificationArtifacts = links.some((link) => link.kind === "test");
  const hasEvidenceArtifacts = links.some(
    (link) => link.kind === "specification" || link.kind === "evidence",
  );
  const hasCapabilityLinks = requirement.linkedCapabilityIds.length > 0;
  const gaps: string[] = [];

  if (!hasCapabilityLinks) {
    gaps.push("missing_capability_link");
  }
  if (!hasDeliveryArtifacts) {
    gaps.push("missing_delivery_artifact");
  }
  if (!hasVerificationArtifacts) {
    gaps.push("missing_verification_artifact");
  }
  if (!hasEvidenceArtifacts) {
    gaps.push("missing_evidence_artifact");
  }

  return {
    hasCapabilityLinks,
    hasDeliveryArtifacts,
    hasVerificationArtifacts,
    hasEvidenceArtifacts,
    artifactCount: links.length,
    gapCount: gaps.length,
    complete: gaps.length === 0,
    gaps,
  };
}

function buildRow(
  requirement: RequirementAggregate,
  artifactKind: SearchTraceabilityMatrixInput["artifactKind"],
): RequirementTraceabilityRow | undefined {
  const links = TraceabilityArtifactRepositoryInMemory.list()
    .map((artifact) => toLink(artifact, requirement))
    .filter((link): link is RequirementTraceabilityLink => link !== undefined);

  const filteredLinks =
    artifactKind === undefined || artifactKind === "all"
      ? sortLinks(links)
      : sortLinks(links.filter((link) => link.kind === artifactKind));

  if (filteredLinks.length === 0) {
    return undefined;
  }

  return {
    requirementId: RequirementId(requirement.id),
    title: requirement.title,
    status: requirement.status,
    priority: requirement.priority,
    verificationStatus: requirement.verificationStatus,
    linkedCapabilityIds: [...requirement.linkedCapabilityIds],
    matchedArtifacts: filteredLinks,
    coverage: buildCoverage(requirement, filteredLinks),
  };
}

function buildSummary(rows: readonly RequirementTraceabilityRow[]): TraceabilityMatrixSummary {
  return rows.reduce<TraceabilityMatrixSummary>(
    (summary, row) => ({
      requirementCount: summary.requirementCount + 1,
      completeCount: summary.completeCount + (row.coverage.complete ? 1 : 0),
      gapCount: summary.gapCount + (row.coverage.complete ? 0 : 1),
      artifactCount: summary.artifactCount + row.matchedArtifacts.length,
      evidenceCount:
        summary.evidenceCount +
        row.matchedArtifacts.filter(
          (artifact) => artifact.kind === "specification" || artifact.kind === "evidence",
        ).length,
      verificationCount:
        summary.verificationCount +
        row.matchedArtifacts.filter((artifact) => artifact.kind === "test").length,
    }),
    {
      requirementCount: 0,
      completeCount: 0,
      gapCount: 0,
      artifactCount: 0,
      evidenceCount: 0,
      verificationCount: 0,
    },
  );
}

export const getTraceabilityRow = {
  id: "traceability.get",
  execute(input: GetTraceabilityRowInput): GetTraceabilityRowOutput {
    const requirement = requirementService.getRequirement({ id: input.requirementId });
    if (requirement === undefined) {
      return undefined;
    }
    return buildRow(requirement, "all");
  },
} as const;

export const searchTraceabilityMatrix = {
  id: "traceability.search",
  execute(input: SearchTraceabilityMatrixInput): SearchTraceabilityMatrixOutput {
    const rows = requirementService
      .listRequirements()
      .filter((requirement) =>
        input.requirementId !== undefined ? requirement.id === input.requirementId : true,
      )
      .filter((requirement) =>
        input.linkedCapabilityId !== undefined
          ? requirement.linkedCapabilityIds.includes(input.linkedCapabilityId)
          : true,
      )
      .map((requirement) => buildRow(requirement, input.artifactKind ?? "all"))
      .filter((row): row is RequirementTraceabilityRow => row !== undefined)
      .filter((row) =>
        input.coverage === "complete"
          ? row.coverage.complete
          : input.coverage === "gaps"
            ? !row.coverage.complete
            : true,
      );

    return {
      items: rows,
      total: rows.length,
      summary: buildSummary(rows),
    };
  },
} as const;

export const traceabilityQueries = {
  [getTraceabilityRow.id]: getTraceabilityRow,
  [searchTraceabilityMatrix.id]: searchTraceabilityMatrix,
} as const;
