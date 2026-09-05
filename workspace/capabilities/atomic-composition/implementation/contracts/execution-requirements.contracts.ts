import { z } from "zod";
import type { WorkId } from "../../../work-core/contracts/work.contracts";
import type { CapabilityProvider } from "../services/capability-resolver.service.js";

// ============================================================================
// WAVE E: EXECUTION FABRIC - EXECUTION REQUIREMENT CONTRACT (EOS-WORK-EXEC-001)
// First work item in user's 10× shift request: build Work Execution Fabric
// Implements the EXACT abstraction user requested: WORK → WHAT MUST HAPPEN? → EXECUTION REQUIREMENTS
// Full documentation in user's message: "Kita perlu satu abstraction baru: Execution Requirement."
// ============================================================================

// ExecutionRequirementId - follows existing ID branding pattern from atomic-composition.contracts.ts
export type ExecutionRequirementId = string & { __brand: "ExecutionRequirementId" };
export function ExecutionRequirementId(value: string): ExecutionRequirementId { 
  return value as ExecutionRequirementId; 
}

// ----------------------------------------------------------------------------
// FAILURE MODES - User's requirement: ALL failure paths as first-class assets
// "failure path justru menjadi aset. Kita jangan hanya test: SUCCESS. Tetapi: SUCCESS, NO_RESPONSE, ..."
// ----------------------------------------------------------------------------
export const ExecutionFailureModeSchema = z.enum([
  "SUCCESS",
  "NO_RESPONSE",
  "INVALID_RESPONSE", 
  "PROVIDER_UNAVAILABLE",
  "AUTHORIZATION_REQUIRED",
  "EXTERNAL_API_FAILURE",
  "PARTIAL_EXECUTION",
  "AMBIGUOUS_RESULT",
  "RETRY",
  "HUMAN_HANDOFF"
]);

export type ExecutionFailureMode = z.infer<typeof ExecutionFailureModeSchema>;

// ----------------------------------------------------------------------------
// REALITY ACTION - User's sequence: WHAT ACTION CHANGES REALITY?
// "WHAT MUST HAPPEN? → WHAT ACTION CHANGES REALITY? → WHO/WHAT CAN PERFORM IT?"
// ----------------------------------------------------------------------------
export const RealityActionSchema = z.enum([
  "create",    // Create new external entity
  "update",    // Modify existing external entity
  "delete",    // Remove external entity
  "verify",    // Verify external state matches expected
  "observe",   // Monitor external entity for changes
  "submit",    // Submit data to external system
  "approve",   // Approve an action/request
  "reject",    // Reject an action/request
  "escalate",  // Escalate to higher authority
  "handoff"    // Transfer to another provider
]);

export type RealityAction = z.infer<typeof RealityActionSchema>;

// ----------------------------------------------------------------------------
// PROVIDER PRIORITY - User's requirement: HUMAN → SYSTEM → AGENT selection order
// "Kita harus membuat EOS mampu memilih executor dari beberapa kelas: HUMAN → SYSTEM → AGENT."
// ----------------------------------------------------------------------------
export const ProviderPrioritySchema = z.enum([
  "human-first",   // Try human provider first
  "system-first",  // Try system/API provider first  
  "agent-first",   // Try AI agent first
  "hybrid"         // Follow hybrid workflow (agent prepares → human approves → system executes)
]);

export type ProviderPriority = z.infer<typeof ProviderPrioritySchema>;

// ----------------------------------------------------------------------------
// EXECUTION STATUS - Lifecycle states for execution requirements
// ----------------------------------------------------------------------------
export const ExecutionStatusSchema = z.enum([
  "pending",
  "resolving",      // Finding a provider
  "assigned",       // Provider assigned
  "in_progress",    // Execution started
  "blocked",        // Blocked (needs intervention)
  "completed",      // Success
  "failed"          // Terminal failure
]);

export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

// ----------------------------------------------------------------------------
// FAILURE HANDLING CONFIGURATION - Implements all retry/escalation/fallback logic
// ----------------------------------------------------------------------------
export const FailureHandlingSchema = z.object({
  maxRetries: z.number().default(3),
  retryBackoffMs: z.number().default(5000),
  escalationTimeoutMs: z.number().default(3600000), // 1 hour default
  fallbackProviderIds: z.array(z.string()).default([]),
  allowedFailureModes: z.array(ExecutionFailureModeSchema).default(["RETRY", "HUMAN_HANDOFF"])
});

export type FailureHandling = z.infer<typeof FailureHandlingSchema>;

// ----------------------------------------------------------------------------
// EXECUTION REQUIREMENT SCHEMA - Core abstraction user requested
// Wraps everything into a single, reusable primitive that can decompose ANY Work
// ----------------------------------------------------------------------------
export const ExecutionRequirementSchema = z.object({
  // Identity fields - follows existing patterns from CapabilityRequirementSchema
  id: z.string(),
  executionRequirementId: z.string().brand<"ExecutionRequirementId">(),
  workId: z.string().brand<"WorkId">(), // Links to parent Work (always)
  
  // What must be done
  title: z.string(),
  description: z.string(),
  
  // What action changes reality (user's requirement)
  realityAction: RealityActionSchema,
  targetExternalEntity: z.string().optional(), // What external system/entity to modify
  requiredAdapterInterface: z.string().optional(), // Which adapter is needed (reality bridge)
  
  // Who can perform it (user's provider selection)
  providerPriority: ProviderPrioritySchema.default("human-first"),
  assignedProviderId: z.string().optional(), // ID of assigned CapabilityProvider
  capabilityReference: z.string(), // Core capability ID to execute this requirement
  
  // Failure handling (user's requirement: all failure paths first-class)
  failureHandling: FailureHandlingSchema.default({}),
  
  // Core requirement metadata - REUSES existing primitives from requirement-management
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: ExecutionStatusSchema.default("pending"),
  evidenceRequired: z.string().optional(),
  completedAt: z.string().optional(),
  failedAt: z.string().optional(),
  failureMode: ExecutionFailureModeSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ExecutionRequirement = z.infer<typeof ExecutionRequirementSchema>;

// ----------------------------------------------------------------------------
// EXECUTION READINESS GATE - User's 12-step production readiness check
// "Saya bahkan akan membuat 'Execution Readiness Gate'."
// ER-01 to ER-12 as defined in user's message
// ----------------------------------------------------------------------------
export const ExecutionReadinessGateSchema = z.object({
  er01_requirement_defined: z.boolean(),
  er02_capability_resolved: z.boolean(),
  er03_provider_resolved: z.boolean(),
  er04_authorization_resolved: z.boolean(),
  er05_action_executable: z.boolean(),
  er06_external_interface_available: z.boolean(),
  er07_external_effect_observable: z.boolean(),
  er08_evidence_captured: z.boolean(),
  er09_state_transition_valid: z.boolean(),
  er10_outcome_verifiable: z.boolean(),
  er11_human_acceptance_possible: z.boolean(),
  er12_failure_path_handled: z.boolean()
});

export type ExecutionReadinessGate = z.infer<typeof ExecutionReadinessGateSchema>;

// Calculate readiness score (0-12)
export function calculateReadinessScore(gate: ExecutionReadinessGate): number {
  return Object.values(gate).filter(Boolean).length;
}

// ----------------------------------------------------------------------------
// WAVE E: EXECUTION ATTEMPT (EOS-WORK-EXEC-E5) - Retry/attempt tracking for idempotency
// "ExecutionAttempt" - tracks each attempt to execute an action (supports retries)
// ----------------------------------------------------------------------------
export const ExecutionAttemptSchema = z.object({
  attemptId: z.string().brand<"AttemptId">(),
  actionId: z.string().brand<"ActionId">(),
  attemptNumber: z.number(), // 1, 2, 3 for retries
  status: ExecutionStatusSchema.default("pending"),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  failureMode: ExecutionFailureModeSchema.optional(),
  idempotencyKey: z.string() // Unique key to prevent duplicate execution
});

export type ExecutionAttempt = z.infer<typeof ExecutionAttemptSchema>;
export type AttemptId = string & { __brand: "AttemptId" };
export function AttemptId(value: string): AttemptId { return value as AttemptId; }

// ----------------------------------------------------------------------------
// WAVE E: ACTION CONTRACT (EOS-WORK-EXEC-E4) - What action is executed
// "Action" - the concrete execution that changes reality
// ----------------------------------------------------------------------------
export const ActionParameterSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  required: z.boolean().default(true),
  description: z.string().optional()
});

export const ActionSchema = z.object({
  actionId: z.string().brand<"ActionId">(),
  executionRequirementId: z.string().brand<"ExecutionRequirementId">(),
  actionType: RealityActionSchema,
  parameters: z.array(ActionParameterSchema).default([]),
  invokedAt: z.string().optional(),
  completedAt: z.string().optional(),
  invokedBy: z.string(), // Provider ID that executed this action
  invocationHash: z.string().optional(), // For audit trail integrity
  status: ExecutionStatusSchema.default("pending")
});

export type Action = z.infer<typeof ActionSchema>;
export type ActionId = string & { __brand: "ActionId" };
export function ActionId(value: string): ActionId { return value as ActionId; }

// ----------------------------------------------------------------------------
// WAVE E: EXTERNAL EFFECT (EOS-WORK-EXEC-E6) - What changed in reality
// "External Effect" - the actual consequence on the external world
// ----------------------------------------------------------------------------
export const ExternalEffectSchema = z.object({
  effectId: z.string().brand<"EffectId">(),
  actionId: z.string().brand<"ActionId">(),
  targetEntityId: z.string(), // Which external entity was modified
  entityType: z.string(), // ERP, CRM, LMS, WhatsApp, Email, etc.
  previousState: z.string().optional(), // Serialized previous state
  newState: z.string().optional(), // Serialized new state
  stateChanged: z.boolean(), // Did the change actually happen?
  observedAt: z.string(),
  sourceAdapter: z.string().optional() // Which adapter reported this effect
});

export type ExternalEffect = z.infer<typeof ExternalEffectSchema>;
export type EffectId = string & { __brand: "EffectId" };
export function EffectId(value: string): EffectId { return value as EffectId; }

// ----------------------------------------------------------------------------
// WAVE E: OBSERVATION (EOS-WORK-EXEC-E7) - What EOS observed from reality
// "Observation" - EOS's perception of the external effect
// ----------------------------------------------------------------------------
export const ObservationSchema = z.object({
  observationId: z.string().brand<"ObservationId">(),
  effectId: z.string().brand<"EffectId">(),
  observerType: z.enum(["system", "human", "agent", "adapter"]),
  observerId: z.string(),
  observation: z.string(), // Human-readable description of what was observed
  matchesExpected: z.boolean(), // Did the effect match what we expected?
  confidenceScore: z.number().min(0).max(1), // How sure are we about this observation?
  evidenceLink: z.string().optional(), // Link to evidence (screenshot, log, etc.)
  observedAt: z.string()
});

export type Observation = z.infer<typeof ObservationSchema>;
export type ObservationId = string & { __brand: "ObservationId" };
export function ObservationId(value: string): ObservationId { return value as ObservationId; }

// ----------------------------------------------------------------------------
// WAVE E: EVIDENCE BINDING (EOS-WORK-EXEC-E8) - Evidence attached to execution
// "Evidence Binding" - Links all artifacts into a single audit trail
// ----------------------------------------------------------------------------
export const EvidenceSchema = z.object({
  evidenceId: z.string().brand<"EvidenceId">(),
  executionRequirementId: z.string().brand<"ExecutionRequirementId">(),
  actionId: z.string().brand<"ActionId">().optional(),
  effectId: z.string().brand<"EffectId">().optional(),
  observationId: z.string().brand<"ObservationId">().optional(),
  evidenceType: z.enum(["api_log", "email_receipt", "whatsapp_message", "document", "screenshot", "human_confirmation", "system_log"]),
  evidenceUrl: z.string(), // Persistent URL to evidence storage
  contentHash: z.string(), // SHA-256 hash of evidence for integrity
  capturedBy: z.string(), // Who/what captured this evidence
  capturedAt: z.string(),
  verified: z.boolean().default(false),
  verifiedAt: z.string().optional(),
  verifierId: z.string().optional()
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type EvidenceId = string & { __brand: "EvidenceId" };
export function EvidenceId(value: string): EvidenceId { return value as EvidenceId; }

// ----------------------------------------------------------------------------
// RUNTIME PROOFS (RP01-RP06) - Separate from readiness gates to avoid checklist theater
// Implements user's requirement for real runtime verification, not just static checks
// ----------------------------------------------------------------------------
export const RuntimeProofsSchema = z.object({
  rp01_external_invocation_verified: z.boolean(),
  rp02_effect_observed: z.boolean(),
  rp03_evidence_bound: z.boolean(),
  rp04_idempotency_enforced: z.boolean(),
  rp05_authorization_enforced: z.boolean(),
  rp06_outcome_verified: z.boolean()
});

export type RuntimeProofs = z.infer<typeof RuntimeProofsSchema>;

// ----------------------------------------------------------------------------
// FULL EXECUTION CHAIN - Binds everything together per Work
// Implements user's execution chain: Requirement → Capability → Provider → Interface → Action → Attempt → Effect → Observation → Evidence
// Canonical: ExecutionChain key = WorkId - all artifacts linked via workId
// ----------------------------------------------------------------------------
export const ExecutionChainSchema = z.object({
  workId: z.string().brand<"WorkId">(),
  executionRequirements: z.array(z.string().brand<"ExecutionRequirementId">()).default([]),
  actions: z.array(z.string().brand<"ActionId">()).default([]),
  attempts: z.array(z.string().brand<"AttemptId">()).default([]), // Track all execution attempts
  effects: z.array(z.string().brand<"EffectId">()).default([]),
  observations: z.array(z.string().brand<"ObservationId">()).default([]),
  evidences: z.array(z.string().brand<"EvidenceId">()).default([]),
  overallStatus: ExecutionStatusSchema.default("pending"),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  readinessGate: ExecutionReadinessGateSchema,
  runtimeProofs: RuntimeProofsSchema, // Separate runtime verification
  readinessScore: z.number().min(0).max(12)
});

export type ExecutionChain = z.infer<typeof ExecutionChainSchema>;

// Export all execution contracts
export * from "./execution-requirements.contracts";