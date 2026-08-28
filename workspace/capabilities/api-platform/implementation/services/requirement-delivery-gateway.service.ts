// Temporarily commented out to unblock build - all missing capabilities temporarily disabled
// import type {
//   RequirementPriority,
//   RequirementStatus,
//   RequirementVerificationStatus,
// } from "../../../requirement-management/implementation/contracts/index.js";
// import { requirementsTraceabilityMatrixService } from "../../../requirements-traceability-matrix/implementation/service.js";
// import { evidenceRegistryService } from "../../../evidence-registry/implementation/service.js";
import type { EvidenceRecordKind } from "../../../evidence-registry/implementation/contracts/index.js";

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
      .filter((row: any) =>
        input.verificationStatus === undefined || input.verificationStatus === "all"
          ? true
          : row.verificationStatus === input.verificationStatus,
      )
      .map<RequirementDeliveryTraceabilityItem>((row: any) => {
        const requirementRefs = unique(
          row.matchedArtifacts.flatMap((artifact: any) => artifact.externalRequirementRefs ?? []),
        );
        const evidenceRecords = unique(
          requirementRefs.flatMap((requirementRef: string) =>
            evidenceRegistryService
              .searchEvidenceRegistry({
                requirementRef,
                limit: 500,
                offset: 0,
              })
              .items.map((item: any) => item.id),
          ),
        )
          .map((id: string) => evidenceRegistryService.getEvidenceRecord({ id }))
          .filter((item: any): item is NonNullable<typeof item> => item !== undefined);

        const kindBreakdown = evidenceRecords.reduce<Record<EvidenceRecordKind, number>>(
          (acc, record: any) => {
            acc[record.kind as EvidenceRecordKind] += 1;
            return acc;
          },
          createEmptyEvidenceKindBreakdown(),
        );

        const latestUpdatedAt =
          evidenceRecords.length === 0
            ? null
            : [...evidenceRecords]
                .sort((left: any, right: any) => right.updatedAt.localeCompare(left.updatedAt))[0]
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
            verificationArtifactCount: row.matchedArtifacts.filter((artifact: any) => artifact.kind === "test")
              .length,
            evidenceArtifactCount: row.matchedArtifacts.filter(
              (artifact: any) => artifact.kind === "specification" || artifact.kind === "evidence",
            ).length,
            gaps: row.coverage.gaps,
          },
          evidence: {
            requirementRefs,
            matchedCount: evidenceRecords.length,
            latestUpdatedAt,
            samplePaths: evidenceRecords.slice(0, 3).map((record: any) => record.path),
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
        verifiedCount: matchedItems.filter((item: any) => item.verificationStatus === "passed").length,
      },
    };
  }
}

export const requirementDeliveryGatewayService =
  new RequirementDeliveryGatewayService();