import type { TransformationDeclaration } from "../../interfaces.js";

export const TRANSFORMATION_T002: TransformationDeclaration = {
  transformation_id: "T002",
  name_long: "EIR to CAG",
  description:
    "Transforms a verified EOS Instruction Record (EIR) into a Capability Artifact Graph (CAG).",
  input_kind: "EIR_INSTRUCTION_RECORD_PLUS_CONTRACT_REF",
  output_kind: "CAG_CAPABILITY_ARTIFACT_GRAPH",
  lifecycle: "DRAFT",
  contract_ref:
    "/root/Enterprise OS/workspace/contracts/transformations/t002-eir-to-cag.contract.yaml",
  predicate_refs: [
    { predicate_id: "PRED-T002-INPUT-EIR-VERIFIED", phase: "PRE_EXECUTION" },
    {
      predicate_id: "PRED-T002-OUTPUT-DETERMINISTIC",
      phase: "POST_EXECUTION_VERIFICATION",
    },
    { predicate_id: "PRED-T002-CONFORM-CAG", phase: "POST_EXECUTION" },
  ],
  evidence_output_kind: "TRANSFORMATION_PROOF",
  evidence_output_id: "TRF-PROOF-T002",
  root_of_trust: false,
  standalone_implementation_required: true,
  engine_dependency_forbidden_until_gate_c_verified: false,
  precedence: "AFTER_T001_PASS",
  blocked_until_predecessor_verified: true,
  predecessor_id: "T001",
};
