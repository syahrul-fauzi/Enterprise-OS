import type { PredicateDeclaration } from "../../interfaces";

export const T001_PREDICATES: readonly PredicateDeclaration[] = [
  {
    predicate_id: "PRED-T001-INPUT-SCHEMA",
    name: "T001 Input Conforms to ELS Document Schema",
    description:
      "Validate that the T001 input YAML document conforms to the canonical ElsDocumentSchema before any transformation is attempted.",
    phase: "PRE_EXECUTION",
    transformation_id: "T001",
    applies_to: "SPECIFIC_TRANSFORMATIONS",
    failure_mode: "INPUT_REJECTED",
    severity: "BLOCKER",
    schema_ref: "@repo/core-eir/schema#ElsDocumentSchema",
    order: 1,
  },
  {
    predicate_id: "PRED-T001-OUTPUT-DETERMINISTIC",
    name: "T001 Output is Deterministic (2x run hash equality)",
    description:
      "Run T001 twice on identical input hash and verify the output SHA256 hash is byte-identical between run 1 and run 2.",
    phase: "POST_EXECUTION_VERIFICATION",
    transformation_id: "T001",
    applies_to: "SPECIFIC_TRANSFORMATIONS",
    failure_mode: "TRANSFORMATION_DECLARED_NONDETERMINISTIC",
    severity: "BLOCKER",
    order: 2,
  },
  {
    predicate_id: "PRED-T001-CONFORM-EIR",
    name: "T001 Output Conforms to EIR Record Schema",
    description:
      "Validate that the T001 output JSON conforms to the canonical EirRecordSchema with all required fields including determinism_context.",
    phase: "POST_EXECUTION",
    transformation_id: "T001",
    applies_to: "SPECIFIC_TRANSFORMATIONS",
    failure_mode: "OUTPUT_NONCONFORMANT",
    severity: "BLOCKER",
    schema_ref: "@repo/core-eir/schema#EirRecordSchema",
    order: 3,
  },
] as const;
