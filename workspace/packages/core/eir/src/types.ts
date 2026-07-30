export type CanonicalStatus =
  | "DRAFT"
  | "REVIEWED"
  | "VERIFIED"
  | "FROZEN"
  | "DEPRECATED";

export type SpecKind =
  | "ELS_LANGUAGE_SPECIFICATION"
  | "EIR_INSTRUCTION_RECORD"
  | "CAG_CAPABILITY_ARTIFACT_GRAPH"
  | "TS_IR_TYPESCRIPT_INTERMEDIATE_REPRESENTATION"
  | "RUNTIME_ARTIFACTS_DIST"
  | "REPOSITORY_PROOF_JSON";

export interface ElsIdentity {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly kind: SpecKind;
  readonly status: CanonicalStatus;
  readonly language_spec_version: string;
}

export interface EirInstruction {
  readonly instruction_id: string;
  readonly op:
    | "DECLARE_REQUIREMENT_IDENTITY"
    | "DECLARE_BUSINESS_STATEMENT"
    | "DECLARE_COMPLIANCE_RULES"
    | "DECLARE_CAPABILITY_DEPS"
    | "DECLARE_TRACEABILITY_ANCHORS"
    | string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly order: number;
}

export interface EirCapabilityRef {
  readonly capability_id: string;
  readonly capability_name: string;
  readonly purpose: string;
}

export interface EirTraceAnchor {
  readonly anchor: string;
  readonly propagates_to: string;
}

export interface EirDeterminismContext {
  readonly input_hash: string;
  readonly deterministic_nonce: string;
}
