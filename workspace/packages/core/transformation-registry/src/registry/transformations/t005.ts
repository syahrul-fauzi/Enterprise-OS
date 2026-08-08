import type { TransformationDeclaration } from "../../interfaces.js";

export const TRANSFORMATION_T005: TransformationDeclaration = {
  transformation_id: "T005",
  name_long: "Runtime Output to Repository Proof",
  description:
    "Consumes Runtime manifest + T001..T004 hashes and emits Repository Proof JSON.",
  input_kind: "RUNTIME_MANIFEST_PLUS_4_HASHES",
  output_kind: "REPOSITORY_PROOF_JSON",
  lifecycle: "DRAFT",
  contract_ref:
    "/root/Enterprise-OS/workspace/contracts/transformations/t005-runtime-to-repo-proof.contract.yaml",
  predicate_refs: [
    { predicate_id: "PRED-T005-INPUT-4-HASHES-SET", phase: "PRE_EXECUTION" },
    {
      predicate_id: "PRED-T005-SIGNATURE-VALID-FORMAT",
      phase: "POST_EXECUTION",
    },
    {
      predicate_id: "PRED-T005-VERDICT-AND-ONLY-IF-T001-T004-PASS",
      phase: "POST_EXECUTION_VERIFICATION",
    },
  ],
  evidence_output_kind: "REPOSITORY_PROOF",
  evidence_output_id: "REP-PROOF-<seq>",
  root_of_trust: false,
  standalone_implementation_required: true,
  engine_dependency_forbidden_until_gate_c_verified: false,
  precedence: "AFTER_T004_PASS",
  blocked_until_predecessor_verified: true,
  predecessor_id: "T004",
};
