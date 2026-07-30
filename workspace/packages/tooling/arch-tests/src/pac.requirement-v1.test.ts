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
  proof_runner?: {
    surface: string;
    mode: string;
    requires_verified_transformations: boolean;
  };
  canonical_conformance_asset?: {
    id: string;
    golden_reference_root: string;
  };
  registry_constraints?: {
    transformation_status_required: string;
    draft_execution_allowed: boolean;
  };
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
    proof_ledger?: string;
  };
  overall_acceptance: PacStageStatus;
}

// This file remains the PAC executable surface for compatibility, but its
// operational role is the PoE v1 Proof Runner.
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

  if (
    contract.registry_constraints?.transformation_status_required &&
    contract.registry_constraints.transformation_status_required !== "VERIFIED"
  ) {
    failures.push("PoE v1 requires VERIFIED transformations only");
  }

  if (contract.registry_constraints?.draft_execution_allowed) {
    failures.push("PoE v1 must reject DRAFT transformations");
  }

  if (
    contract.canonical_conformance_asset?.id &&
    contract.canonical_conformance_asset.id !== "REQ-0001"
  ) {
    failures.push("canonical conformance asset must remain REQ-0001");
  }

  if (
    contract.proof_runner?.requires_verified_transformations !== undefined &&
    !contract.proof_runner.requires_verified_transformations
  ) {
    failures.push("proof runner must require VERIFIED transformations");
  }

  return failures;
}
