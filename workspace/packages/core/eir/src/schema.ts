import { z } from "zod";
import type {
  CanonicalStatus,
  SpecKind,
  ElsIdentity,
  EirInstruction,
  EirCapabilityRef,
  EirDeterminismContext,
  EirTraceAnchor,
} from "./types";

export const CanonicalStatusSchema = z.enum([
  "DRAFT",
  "REVIEWED",
  "VERIFIED",
  "FROZEN",
  "DEPRECATED",
]) satisfies z.ZodType<CanonicalStatus>;

export const SpecKindSchema = z.enum([
  "ELS_LANGUAGE_SPECIFICATION",
  "EIR_INSTRUCTION_RECORD",
  "CAG_CAPABILITY_ARTIFACT_GRAPH",
  "TS_IR_TYPESCRIPT_INTERMEDIATE_REPRESENTATION",
  "RUNTIME_ARTIFACTS_DIST",
  "REPOSITORY_PROOF_JSON",
]) satisfies z.ZodType<SpecKind>;

export const ElsIdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  kind: z.literal("ELS_LANGUAGE_SPECIFICATION"),
  status: CanonicalStatusSchema,
  language_spec_version: z.string().min(1),
}) satisfies z.ZodType<ElsIdentity>;

export const EirInstructionSchema = z.object({
  instruction_id: z.string().min(1),
  op: z.string().min(1),
  payload: z.record(z.unknown()),
  order: z.number().int().nonnegative(),
}) satisfies z.ZodType<EirInstruction>;

export const EirCapabilityRefSchema = z.object({
  capability_id: z.string().min(1),
  capability_name: z.string().min(1),
  purpose: z.string().min(1),
}) satisfies z.ZodType<EirCapabilityRef>;

export const EirTraceAnchorSchema = z.object({
  anchor: z.string().min(1),
  propagates_to: z.string().min(1),
}) satisfies z.ZodType<EirTraceAnchor>;

export const EirDeterminismContextSchema = z.object({
  input_hash: z.string().min(1),
  deterministic_nonce: z.string().min(1),
}) satisfies z.ZodType<EirDeterminismContext>;

export const ElsDocumentSchema = z.object({
  specification: ElsIdentitySchema,
  specification_metadata: z.object({
    author: z.string().min(1),
    created: z.string().min(1),
    governance_class: z.string().min(1),
    change_policy: z.string().min(1),
    hash_algorithm: z.string().min(1),
  }),
  ontology: z.object({
    root_aggregate: z.string().min(1),
    domain: z.string().min(1),
  }),
  requirement_identity: z.object({
    requirement_id: z.string().min(1),
    stable_external_id: z.string().min(1),
    id_policy: z.string().min(1),
  }),
  business_statement: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    origin: z.string().min(1),
  }),
  capability_refs: z.array(EirCapabilityRefSchema),
  instruction_specification: z.object({
    kind: z.string().min(1),
    instruction_count: z.number().int().nonnegative(),
  }),
  compliance_rules: z.array(
    z.object({
      rule: z.string().min(1),
      severity: z.enum(["BLOCKER", "WARNING", "INFO"]),
      enforcement: z.string().min(1),
    }),
  ),
  traceability: z.object({
    anchors: z.array(EirTraceAnchorSchema),
  }),
});

export const EirRecordSchema = z.object({
  eir_id: z.string().min(1),
  transformation_id: z.string().min(1),
  source_els_id: z.string().min(1),
  source_els_version: z.string().min(1),
  source_els_hash: z.string().min(1),
  instruction_set: z.array(EirInstructionSchema),
  capability_refs: z.array(EirCapabilityRefSchema),
  emitted_at: z.string().min(1),
  determinism_context: EirDeterminismContextSchema,
  status: CanonicalStatusSchema,
  spec_kind: z.literal("EIR_INSTRUCTION_RECORD"),
});
