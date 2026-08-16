import type {
  TransformationId,
  TransformationPrecedence,
  TransformationPredicateRef,
  TransformationStatus,
} from "./types";

export interface TransformationDeclaration {
  readonly transformation_id: TransformationId;
  readonly name_long: string;
  readonly description: string;
  readonly input_kind: string;
  readonly output_kind: string;
  readonly lifecycle: TransformationStatus;
  readonly contract_ref: string;
  readonly predicate_refs: readonly TransformationPredicateRef[];
  readonly evidence_output_kind: "TRANSFORMATION_PROOF" | "REPOSITORY_PROOF";
  readonly evidence_output_id: string;
  readonly golden_reference_input?: string;
  readonly root_of_trust: boolean;
  readonly standalone_implementation_required: boolean;
  readonly engine_dependency_forbidden_until_gate_c_verified: boolean;
  readonly precedence: TransformationPrecedence;
  readonly blocked_until_predecessor_verified: boolean;
  readonly predecessor_id?: TransformationId;
}

export interface TransformationRegistryDocument {
  readonly registry_id: string;
  readonly version: string;
  readonly status: TransformationStatus;
  readonly catalog_canonical_ref: string;
  readonly transformations: readonly TransformationDeclaration[];
  readonly count: number;
  readonly root_of_trust_transformation: TransformationId;
}
