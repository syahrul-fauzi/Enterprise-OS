import { z } from "zod";

export const CapabilityPrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
export const CapabilityStatusSchema = z.enum([
  "TODO",
  "READY",
  "READY_FOR_IMPLEMENTATION",
  "IMPLEMENTING",
  "TESTING",
  "INTEGRATING",
  "DONE",
]);

export const CapabilityDefinitionSchema = z.object({
  name: z.string().min(1),
  priority: CapabilityPrioritySchema,
  status: CapabilityStatusSchema,
  owner: z.string().min(1).default("unassigned"),
  depends_on: z.array(z.string().min(1)).default([]),
  unlocks: z.array(z.string().min(1)).default([]),
  definition_of_done: z.array(z.string().min(1)).min(1),
  completed_definition_of_done: z.array(z.string().min(1)).default([]),
  outcome: z.string().min(1),
});

export const CapabilityRegistrySchema = z.object({
  version: z.string().min(1),
  status: z.string().min(1),
  ssot: z.literal("CAPABILITY_REGISTRY"),
  mission: z.object({
    target: z.string().min(1),
    phase: z.string().min(1),
  }),
  execution: z.object({
    default_agent_state: z.enum(["RUNNING", "WAITING"]),
    auto_continue: z.boolean(),
    stop_on_hard_blocker_only: z.boolean(),
  }),
  state_machine: z.object({
    states: z.array(z.string().min(1)).min(1),
    auto_transition_after_done: z.string().min(1),
  }),
  capabilities: z.record(z.string().min(1), CapabilityDefinitionSchema),
});

export type CapabilityPriority = z.infer<typeof CapabilityPrioritySchema>;
export type CapabilityStatus = z.infer<typeof CapabilityStatusSchema>;
export type CapabilityDefinition = z.infer<typeof CapabilityDefinitionSchema>;
export type CapabilityRegistry = z.infer<typeof CapabilityRegistrySchema>;

export type EffectiveStatus =
  | "READY"
  | "READY_FOR_IMPLEMENTATION"
  | "IMPLEMENTING"
  | "TESTING"
  | "INTEGRATING"
  | "DONE"
  | "BLOCKED_BY_DEPENDENCIES"
  | "INVALID_DONE";

export type NextTransition =
  | "IMPLEMENTING"
  | "TESTING"
  | "INTEGRATING"
  | "DONE"
  | "UNLOCK_NEXT"
  | "WAIT_FOR_DEPENDENCIES"
  | "FIX_DEFINITION_OF_DONE";

export type ComputedCapability = {
  readonly id: string;
  readonly name: string;
  readonly priority: CapabilityPriority;
  readonly rawStatus: CapabilityStatus;
  readonly effectiveStatus: EffectiveStatus;
  readonly owner: string;
  readonly dependsOn: readonly string[];
  readonly unlocks: readonly string[];
  readonly outcome: string;
  readonly definitionOfDone: readonly string[];
  readonly completedDefinitionOfDone: readonly string[];
  readonly definitionOfDoneCompletedCount: number;
  readonly definitionOfDoneTotalCount: number;
  readonly progressPercent: number;
  readonly dependenciesSatisfied: boolean;
  readonly blockedBy: readonly string[];
  readonly readyForExecution: boolean;
  readonly nextTransition: NextTransition;
};