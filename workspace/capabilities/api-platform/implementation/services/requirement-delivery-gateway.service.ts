import type {
  RequirementPriority,
  RequirementStatus,
  RequirementVerificationStatus,
} from "../../../requirement-management/implementation/contracts";
import { requirementsTraceabilityMatrixService } from "../../../requirements-traceability-matrix/implementation/service";
import { evidenceRegistryService } from "../../../evidence-registry/implementation/service";
import type { EvidenceRecordKind } from "../../../evidence-registry/implementation/contracts";

export type RequirementDeliveryTraceabilityItem = {
  readonly requirementId: string;
  readonly title: string;
  readonly status: RequirementStatus;
  readonly priority: RequirementPriority;
  readonly verificationStatus: RequirementVerificationStatus;
  readonly linkedCapabilityIds: readonly string[];
  readonly traceability: {
    readonly complete: boolean;
    readonly artifactCount: number;
    readonly verificationArtifactCount: number;
    readonly evidenceArtifactCount: number;
    readonly gaps: readonly string[];
  };
  readonly evidence: {
    readonly requirementRefs: readonly string[];
    readonly matchedCount: number;
    readonly latestUpdatedAt: string | null;
    readonly samplePaths: readonly string[];
    readonly kindBreakdown: Readonly<Record<EvidenceRecordKind, number>>;
  };
};

export type SearchRequirementDeliveryInput = {
  readonly requirementId?: string;
  readonly linkedCapabilityId?: string;
  readonly coverage?: "all" | "complete" | "gaps";
  readonly verificationStatus?: RequirementVerificationStatus | "all";
  readonly limit?: number;
  readonly offset?: number;
};

export type SearchRequirementDeliveryOutput = {
  readonly items: readonly RequirementDeliveryTraceabilityItem[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
  readonly summary: {
    readonly requirementCount: number;
    readonly completeCount: number;
    readonly evidenceBackedCount: number;
    readonly verifiedCount: number;
  };
};

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function createEmptyEvidenceKindBreakdown(): Record<EvidenceRecordKind, number> {
  return {
    ledger: 0,
    matrix: 0,
    status: 0,
    acceptance: 0,
    metrics: 0,
    specification: 0,
    record: 0,
    contract: 0,
  };
}

export class RequirementDeliveryGatewayService {
  search(input: SearchRequirementDeliveryInput): SearchRequirementDeliveryOutput {
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 20;

    const rows = requirementsTraceabilityMatrixService.searchTraceabilityMatrix({
      requirementId: input.requirementId,
      linkedCapabilityId: input.linkedCapabilityId,
      coverage: input.coverage,
    }).items;

    const matchedItems = rows
      .filter((row) =>
        input.verificationStatus === undefined || input.verificationStatus === "all"
          ? true
          : row.verificationStatus === input.verificationStatus,
      )
      .map<RequirementDeliveryTraceabilityItem>((row) => {
        const requirementRefs = unique(
          row.matchedArtifacts.flatMap((artifact) => artifact.externalRequirementRefs ?? []),
        );
        const evidenceRecords = unique(
          requirementRefs.flatMap((requirementRef) =>
            evidenceRegistryService
              .searchEvidenceRegistry({
                requirementRef,
                limit: 500,
                offset: 0,
              })
              .items.map((item) => item.id),
          ),
        )
          .map((id) => evidenceRegistryService.getEvidenceRecord({ id }))
          .filter((item): item is NonNullable<typeof item> => item !== undefined);

        const kindBreakdown = evidenceRecords.reduce<Record<EvidenceRecordKind, number>>(
          (acc, record) => {
            acc[record.kind] += 1;
            return acc;
          },
          createEmptyEvidenceKindBreakdown(),
        );

        const latestUpdatedAt =
          evidenceRecords.length === 0
            ? null
            : [...evidenceRecords]
                .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
                ?.updatedAt ?? null;

        return {
          requirementId: row.requirementId,
          title: row.title,
          status: row.status,
          priority: row.priority,
          verificationStatus: row.verificationStatus,
          linkedCapabilityIds: row.linkedCapabilityIds,
          traceability: {
            complete: row.coverage.complete,
            artifactCount: row.coverage.artifactCount,
            verificationArtifactCount: row.matchedArtifacts.filter((artifact) => artifact.kind === "test")
              .length,
            evidenceArtifactCount: row.matchedArtifacts.filter(
              (artifact) => artifact.kind === "specification" || artifact.kind === "evidence",
            ).length,
            gaps: row.coverage.gaps,
          },
          evidence: {
            requirementRefs,
            matchedCount: evidenceRecords.length,
            latestUpdatedAt,
            samplePaths: evidenceRecords.slice(0, 3).map((record) => record.path),
            kindBreakdown,
          },
        };
      });

    return {
      items: matchedItems.slice(offset, offset + limit),
      total: matchedItems.length,
      matched: matchedItems.length,
      offset,
      limit,
      summary: {
        requirementCount: matchedItems.length,
        completeCount: matchedItems.filter((item) => item.traceability.complete).length,
        evidenceBackedCount: matchedItems.filter((item) => item.evidence.matchedCount > 0).length,
        verifiedCount: matchedItems.filter((item) => item.verificationStatus === "passed").length,
      },
    };
  }
}

export const requirementDeliveryGatewayService =
  new RequirementDeliveryGatewayService();
