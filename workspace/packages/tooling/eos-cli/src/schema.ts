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

// Current Journey Schema - for .eos-state/current-journey.yaml EOS journey tracking
// ENFORCES SINGLE NEXT WORK PRINCIPLE: hanya satu next_work_id yang diizinkan (SATU NEXT WORK SAJA)
export const CurrentJourneySchema = z.object({
  work_id: z.string().min(1),
  milestone: z.string().min(1),
  completed_at: z.string().datetime().or(z.literal("")).default(""), // Only set to ISO timestamp when journey is COMPLETED/PASS
  verdict: z.enum(["PASS", "FAIL", "BLOCKED", "OUT_OF_SCOPE", "UNVERIFIED", "UNKNOWN"]),
  evidence_artifacts: z.array(z.string()),
  checks_passed: z.array(z.string()),
  checks_failed: z.array(z.string()),
  next_work_id: z.string().min(1).or(z.literal("")).default(""), // Allow empty string only when journey is complete
  next_work_technical_id: z.string().min(1).or(z.literal("")).default(""), // Bound actual repository technical ID (work_<UUID>) to journey tracking ID
  next_work_title: z.string().min(1).or(z.literal("")).default(""),
  next_work_description: z.string().min(1).or(z.literal("")).default(""),
  next_work_milestones: z.array(z.record(z.string(), z.string())),
  next_milestone: z.string().optional(),
  phase2_complete: z.boolean().optional(),
  phase3_complete: z.boolean().optional(),
});

export type RepositoryState = z.infer<typeof RepositoryStateSchema>;
export type RepositoryProofOutputPointer = z.infer<typeof RepositoryProofOutputPointerSchema>;
export type GovernanceState = z.infer<typeof GovernanceStateSchema>;
export type CurrentJourney = z.infer<typeof CurrentJourneySchema>;