import type {
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
}

export const evidenceRegistryService = new EvidenceRegistryService();

export * from "../contracts";
export * from "../queries";
export * from "../repository";
