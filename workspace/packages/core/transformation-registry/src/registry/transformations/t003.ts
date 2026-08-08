import type { TransformationDeclaration } from "../../interfaces.js";

export const TRANSFORMATION_T003: TransformationDeclaration = {
  transformation_id: "T003",
  name_long: "CAG to TS IR",
  description:
    "Transforms a verified Capability Artifact Graph into TypeScript Intermediate Representation.",
  input_kind: "CAG_SNAPSHOT",
  output_kind: "TS_IR_TYPESCRIPT_INTERMEDIATE_REPRESENTATION",
  lifecycle: "DRAFT",
  contract_ref:
    "/root/Enterprise-OS/workspace/contracts/transformations/t003-cag-to-tsir.contract.yaml",
  predicate_refs: [
    { predicate_id: "PRED-T003-INPUT-CAG-VERIFIED", phase: "PRE_EXECUTION" },
    {
      predicate_id: "PRED-T003-NO-HARDCODED-CAPABILITY-ID",
      phase: "POST_EXECUTION",
    },
    {
      predicate_id: "PRED-T003-OUTPUT-DETERMINISTIC",
      phase: "POST_EXECUTION_VERIFICATION",
    },
  ],
  evidence_output_kind: "TRANSFORMATION_PROOF",
  evidence_output_id: "TRF-PROOF-T003",
  root_of_trust: false,
  standalone_implementation_required: true,
  engine_dependency_forbidden_until_gate_c_verified: false,
  precedence: "AFTER_T002_PASS",
  blocked_until_predecessor_verified: true,
  predecessor_id: "T002",
};
