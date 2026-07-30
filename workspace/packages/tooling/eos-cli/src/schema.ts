import { z } from "zod";

export const LifecycleStatusSchema = z.enum([
  "DRAFT",
  "REVIEWED",
  "VERIFIED",
  "FROZEN",
  "DEPRECATED",
]);

export const RepositoryGateStatusesSchema = z.object({
  A: LifecycleStatusSchema,
  B: LifecycleStatusSchema,
  C: LifecycleStatusSchema,
  D: LifecycleStatusSchema,
  E: LifecycleStatusSchema,
});

export const RepositoryProofHashesSchema = z.object({
  baseline_hash: z.string(),
  governance_hash: z.string(),
  dependency_hash: z.string(),
  registry_hash: z.string(),
});

export const RepositoryReadinessSchema = z.object({
  gate_b: z.boolean(),
  gate_c: z.boolean(),
  gate_d: z.boolean(),
  gate_e: z.boolean(),
});

export const RepositoryProofOutputPointerSchema = z.object({
  location: z.string().min(1),
  current_file: z.string().min(1),
  current_status: z.string().min(1),
  generation_rule: z.string().min(1),
  anti_pattern: z.string().min(1),
});

export const RepositoryOutputsSchema = z.object({
  repository_proof: RepositoryProofOutputPointerSchema,
  transformation_proofs: z.object({
    location: z.string().min(1),
    anti_pattern: z.string().min(1),
  }),
});

export const RepositoryStateSchema = z.object({
  constitution: z.enum(["locked", "unlocked"]),
  governance: LifecycleStatusSchema,
  gates: RepositoryGateStatusesSchema,
  proof: RepositoryProofHashesSchema,
  readiness: RepositoryReadinessSchema,
  outputs: RepositoryOutputsSchema,
});

export const GovernanceStateSchema = z.object({
  repository_state: RepositoryStateSchema,
  baseline: z.object({
    id: z.string().min(1),
    version: z.string().min(1),
    status: LifecycleStatusSchema,
    source: z.string().min(1),
  }),
});

export type RepositoryState = z.infer<typeof RepositoryStateSchema>;
export type RepositoryProofOutputPointer = z.infer<typeof RepositoryProofOutputPointerSchema>;
export type GovernanceState = z.infer<typeof GovernanceStateSchema>;
