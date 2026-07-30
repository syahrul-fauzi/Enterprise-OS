import type { TransformationDeclaration } from "../../interfaces.js";

export const TRANSFORMATION_T004: TransformationDeclaration = {
  transformation_id: "T004",
  name_long: "TS IR to Runtime Artifacts",
  description: "Transforms TS IR + Registry into distributable Runtime Artifacts.",
  input_kind: "TS_IR_PLUS_REGISTRY",
  output_kind: "RUNTIME_ARTIFACTS_DIST",
  lifecycle: "DRAFT",
  contract_ref:
    "/root/Enterprise OS/workspace/contracts/transformations/t004-tsir-to-runtime.contract.yaml",
  predicate_refs: [
    { predicate_id: "PRED-T004-INPUT-TSIR-VERIFIED", phase: "PRE_EXECUTION" },
    {
      predicate_id: "PRED-T004-OUTPUT-DETERMINISTIC",
      phase: "POST_EXECUTION_VERIFICATION",
    },
    {
      predicate_id: "PRED-T004-CONFORM-RUNTIME-SCHEMA",
      phase: "POST_EXECUTION",
    },
  ],
  evidence_output_kind: "TRANSFORMATION_PROOF",
  evidence_output_id: "TRF-PROOF-T004",
  root_of_trust: false,
  standalone_implementation_required: true,
  engine_dependency_forbidden_until_gate_c_verified: false,
  precedence: "AFTER_T003_PASS",
  blocked_until_predecessor_verified: true,
  predecessor_id: "T003",
};
