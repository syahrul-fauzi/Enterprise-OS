import type { TransformationDeclaration } from "../../interfaces.js";

export const TRANSFORMATION_T001: TransformationDeclaration = {
  transformation_id: "T001",
  name_long: "ELS to EIR",
  description:
    "Transforms a canonical EOS Language Specification (ELS) document into an EOS Instruction Record (EIR).",
  input_kind: "ELS_LANGUAGE_SPEC_DOC",
  output_kind: "EIR_INSTRUCTION_RECORD",
  lifecycle: "VERIFIED",
  contract_ref:
    "/root/Enterprise-OS/workspace/contracts/transformations/t001-els-to-eir.contract.yaml",
  predicate_refs: [
    { predicate_id: "PRED-T001-INPUT-SCHEMA", phase: "PRE_EXECUTION" },
    {
      predicate_id: "PRED-T001-OUTPUT-DETERMINISTIC",
      phase: "POST_EXECUTION_VERIFICATION",
    },
    { predicate_id: "PRED-T001-CONFORM-EIR", phase: "POST_EXECUTION" },
  ],
  evidence_output_kind: "TRANSFORMATION_PROOF",
  evidence_output_id: "TRF-PROOF-T001",
  golden_reference_input:
    "/root/Enterprise-OS/workspace/examples/vertical-slice/REQ-0001",
  root_of_trust: true,
  standalone_implementation_required: true,
  engine_dependency_forbidden_until_gate_c_verified: true,
  precedence: "ROOT",
  blocked_until_predecessor_verified: false,
};
