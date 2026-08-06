import {
  requirementService,
} from "../../../requirement-management/implementation/service";
import type {
  AssessEvidenceInput,
  AssessEvidenceOutput,
  GetEvidenceRecordInput,
  GetEvidenceRecordOutput,
  SearchEvidenceRegistryInput,
  SearchEvidenceRegistryOutput,
} from "../contracts";
import { evidenceRegistryQueries } from "../queries";
import { EvidenceRegistryRepositoryFileSystem } from "../repository";
import { recordRuntimeInvocation } from "@repo/core-runtime";

export class EvidenceRegistryService {
  readonly repositories = {
    EvidenceRecord: EvidenceRegistryRepositoryFileSystem,
  } as const;

  getEvidenceRecord(input: GetEvidenceRecordInput): GetEvidenceRecordOutput {
    const result = evidenceRegistryQueries["evidence.get"].execute(input);
    recordRuntimeInvocation({
      capabilityId: "evidence-registry",
      operationId: "get-evidence-record",
      sourceRef: "EvidenceRegistryService.getEvidenceRecord",
      success: result !== undefined,
      input,
      result: result ?? { error: "evidence_not_found", id: input.id },
    });
    return result;
  }

  searchEvidenceRegistry(
    input: SearchEvidenceRegistryInput,
  ): SearchEvidenceRegistryOutput {
    const result = evidenceRegistryQueries["evidence.search"].execute(input);
    recordRuntimeInvocation({
      capabilityId: "evidence-registry",
      operationId: "search-evidence-registry",
      sourceRef: "EvidenceRegistryService.searchEvidenceRegistry",
      success: true,
      input,
      result: {
        matched: result.matched,
        returned: result.items.length,
        summary: result.summary,
      },
    });
    return result;
  }

  assessEvidence(input: AssessEvidenceInput): AssessEvidenceOutput {
    const requirements = requirementService.getRequirementsByRelease(input.releaseId);
    const evidencePaths: string[] = [];
    let totalEvidence = 0;
    let coveredRequirements = 0;

    for (const req of requirements) {
      const reqEvidence = evidenceRegistryQueries["evidence.search"].execute({
        requirementRef: req.id,
        limit: 100,
      });

      if (reqEvidence.matched > 0) {
        coveredRequirements++;
        totalEvidence += reqEvidence.matched;
        for (const item of reqEvidence.items) {
          if (!evidencePaths.includes(item.path)) {
            evidencePaths.push(item.path);
          }
        }
      }
    }

    const allCovered = coveredRequirements === requirements.length;
    const complete = allCovered && totalEvidence > 0;

    const result: AssessEvidenceOutput = {
      totalEvidence,
      complete,
      evidencePaths,
    };

    recordRuntimeInvocation({
      capabilityId: "evidence-registry",
      operationId: "assess-evidence",
      sourceRef: "EvidenceRegistryService.assessEvidence",
      success: true,
      input,
      result: {
        totalEvidence,
        complete,
        coveredRequirements,
        requirementCount: requirements.length,
      },
    });

    return result;
  }
}

export const evidenceRegistryService = new EvidenceRegistryService();

export * from "../contracts";
export * from "../queries";
export * from "../repository";