import type {
  CanonicalStatus,
  ElsIdentity,
  EirInstruction,
  EirCapabilityRef,
  EirDeterminismContext,
  SpecKind,
  EirTraceAnchor,
} from "./types";

export interface ElsDocument {
  readonly specification: ElsIdentity;
  readonly specification_metadata: {
    readonly author: string;
    readonly created: string;
    readonly governance_class: string;
    readonly change_policy: string;
    readonly hash_algorithm: string;
  };
  readonly ontology: {
    readonly root_aggregate: string;
    readonly domain: string;
  };
  readonly requirement_identity: {
    readonly requirement_id: string;
    readonly stable_external_id: string;
    readonly id_policy: string;
  };
  readonly business_statement: {
    readonly title: string;
    readonly description: string;
    readonly origin: string;
  };
  readonly capability_refs: readonly EirCapabilityRef[];
  readonly instruction_specification: {
    readonly kind: string;
    readonly instruction_count: number;
  };
  readonly compliance_rules: readonly Readonly<{
    rule: string;
    severity: "BLOCKER" | "WARNING" | "INFO";
    enforcement: string;
  }>[];
  readonly traceability: {
    readonly anchors: readonly EirTraceAnchor[];
  };
}

export interface EirRecord {
  readonly eir_id: string;
  readonly transformation_id: "T001" | string;
  readonly source_els_id: string;
  readonly source_els_version: string;
  readonly source_els_hash: string;
  readonly instruction_set: readonly EirInstruction[];
  readonly capability_refs: readonly EirCapabilityRef[];
  readonly emitted_at: string;
  readonly determinism_context: EirDeterminismContext;
  readonly status: CanonicalStatus;
  readonly spec_kind: SpecKind;
}

export interface EirRecordConformanceResult {
  readonly conforms: boolean;
  readonly violations: readonly string[];
  readonly predicate_ref: "PRED-T001-CONFORM-EIR" | string;
}
