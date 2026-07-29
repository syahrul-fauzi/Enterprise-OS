export type PacStageStatus = "pending" | "passed" | "failed";

export interface PacStage {
  stage: string;
  acceptance: string;
  status: PacStageStatus;
}

export interface PacContract {
  pipeline_id: string;
  proof_id: string;
  semantic_id: string;
  lineage_id: string;
  concept: string;
  scope: string;
  stages: PacStage[];
  metrics: {
    sdr: {
      target: number;
      minimum_proof_gate: number;
    };
  };
  artifacts: {
    markdown: string;
    yaml: string;
    test: string;
  };
  overall_acceptance: PacStageStatus;
}

// This file is a minimal executable PAC surface. It is intentionally
// lightweight so the proof contract can be wired into CI incrementally.
export function validateRequirementPac(contract: PacContract): string[] {
  const failures: string[] = [];

  if (contract.semantic_id !== "REQ-0001") {
    failures.push("semantic_id must remain REQ-0001 for PoE v1");
  }

  if (!contract.lineage_id.startsWith("LIN-")) {
    failures.push("lineage_id must use LIN-* format");
  }

  const requiredStages = [
    "els",
    "yaml",
    "compiler",
    "edm",
    "domain",
    "evidence",
    "acceptance",
  ];

  for (const stage of requiredStages) {
    if (!contract.stages.some((item) => item.stage === stage)) {
      failures.push(`missing PAC stage: ${stage}`);
    }
  }

  if (contract.metrics.sdr.minimum_proof_gate < 95) {
    failures.push("PoE v1 requires SDR minimum proof gate >= 95");
  }

  return failures;
}
