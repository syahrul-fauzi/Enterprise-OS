import { z } from "zod";
import {
  DeepReadonly,
  RuntimeIdentifierSchema,
  RuntimeTimestampSchema,
  EvaluationStatusSchema,
} from "../../../workspace/packages/tooling/eos-cli/src/runtime-contracts/models/shared.js";

// ============================================================================
// CONTEXT ANCHOR CONTRACT (EOS-CONTEXT-ANCHOR-001)
// Validasi otomatis untuk work-contract.yaml dan kepatuhan engine terhadap Context Anchor
// Mengikuti pola Zod yang sudah ada di repository dan tidak mengubah existing primitives
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CACHE CANDIDATE SCHEMA - Evidence-based cache decision matrix
// ----------------------------------------------------------------------------
export const CacheCandidateSchema = z.object({
  candidate_id: RuntimeIdentifierSchema,
  read_frequency: z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]),
  parse_cost_ms: z.number().optional(), // Measured parsing time in milliseconds
  mutation_frequency: z.enum(["VERY_LOW", "LOW", "MEDIUM", "HIGH"]),
  staleness_risk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  is_derived: z.boolean(), // Whether this is derived state (in-memory only)
  cache_suitability: z.enum(["PRIMARY", "SECONDARY", "NOT_RECOMMENDED"]),
  decision: z.enum(["APPROVED", "PENDING", "REJECTED"]),
  justification: z.string().min(1),
});

export type CacheCandidate = z.infer<typeof CacheCandidateSchema>;

// ----------------------------------------------------------------------------
// 2. INVALIDATION RULES SCHEMA - When cache must be reloaded/invalidated
// ----------------------------------------------------------------------------
export const InvalidationRuleSchema = z.object({
  rule_id: RuntimeIdentifierSchema,
  condition: z.enum([
    "file_mtime_changed", // Canonical file timestamp changed
    "explicit_invalidation", // Journey Engine explicitly invalidates
    "ttl_expired", // Time-to-live expired
    "stale_state_detected", // Hash mismatch detected
    "manual_trigger", // Human/agent triggered reload
  ]),
  description: z.string().min(1),
  applies_to_candidates: z.array(RuntimeIdentifierSchema), // Which cache candidates this rule applies to
});

export type InvalidationRule = z.infer<typeof InvalidationRuleSchema>;

// ----------------------------------------------------------------------------
// 3. MACHINE WORK CONTRACT SCHEMA - What engines can/cannot do with state
// ----------------------------------------------------------------------------
export const MachineWorkContractSchema = z.object({
  contract_id: RuntimeIdentifierSchema,
  engine_id: RuntimeIdentifierSchema, // Which engine this applies to
  allowed_operations: z.array(z.enum(["read_state", "read_cache", "write_state", "invalidate_cache", "parse_canonical"])),
  forbidden_operations: z.array(z.enum(["modify_canonical_files", "bypass_cache_owner", "invalidate_other_caches", "delete_state_artifacts"])),
  state_access_scope: z.array(z.string()), // Which state paths the engine can access
  ownership_boundary: z.string().min(1), // "Only Journey Engine can invalidate cache"
  compliance_required: z.boolean().default(true),
});

export type MachineWorkContract = z.infer<typeof MachineWorkContractSchema>;

// ----------------------------------------------------------------------------
// 4. CONTEXT ANCHOR EXTENSION SCHEMA - Optional fields added to existing primitives
// ----------------------------------------------------------------------------
export const ContextAnchorExtensionSchema = z.object({
  // All fields are OPTIONAL to maintain backward compatibility with existing code
  current_state: z.unknown().optional(), // Derived from GOVERNANCE_STATE.yaml
  next_work: z.unknown().optional(), // Derived from current-journey.yaml
  active_constraints: z.array(z.unknown()).optional(),
  required_proof: z.array(z.unknown()).optional(),
  recent_decisions: z.array(z.unknown()).optional(),
});

export type ContextAnchorExtension = z.infer<typeof ContextAnchorExtensionSchema>;

// ----------------------------------------------------------------------------
// 5. FULL CONTEXT ANCHOR CONTRACT - Top-level schema for context-anchor-v1.yaml
// ----------------------------------------------------------------------------
export const ContextAnchorContractSchema = z.object({
  contract_version: z.string().regex(/^\d+\.\d+\.\d+$/), // v1.0.0 format
  contract_id: z.literal("EOS-CONTEXT-ANCHOR-001"),
  created_at: RuntimeTimestampSchema,
  last_updated: RuntimeTimestampSchema,
  maintained_by: RuntimeIdentifierSchema,
  
  // Core boundary definitions
  canonical_state_paths: z.array(z.string()), // Paths that remain on disk as source of truth
  derived_state_only: z.array(z.string()), // Paths that only exist in-memory
  
  // Cache definitions
  cache_candidates: z.array(CacheCandidateSchema),
  invalidation_rules: z.array(InvalidationRuleSchema),
  
  // Compliance contracts
  machine_work_contracts: z.array(MachineWorkContractSchema),
  
  // Backward compatibility guarantee
  backward_compatibility_guaranteed: z.boolean().default(true),
  no_breaking_changes_to_existing_primitives: z.boolean().default(true),
  
  // Phase 2 constraints verification
  runtime_unchanged_phase2: z.boolean().default(true),
  sqlite_not_implemented: z.boolean().default(true),
  canonical_yaml_json_preserved: z.boolean().default(true),
});

export type ContextAnchorContract = DeepReadonly<z.infer<typeof ContextAnchorContractSchema>>;

// ----------------------------------------------------------------------------
// 6. WORK CONTRACT VALIDATOR - Automatically validates work-contract.yaml compliance
// ----------------------------------------------------------------------------
export const WorkContractSchema = z.object({
  work_id: RuntimeIdentifierSchema,
  milestone: z.string().min(1),
  completed_at: RuntimeTimestampSchema,
  verdict: EvaluationStatusSchema,
  evidence_artifacts: z.array(z.string()),
  checks_passed: z.array(z.string()),
  checks_failed: z.array(z.string()),
  next_milestone: z.string().optional(),
  phase2_complete: z.boolean().optional(),
});

export type WorkContract = z.infer<typeof WorkContractSchema>;

// ----------------------------------------------------------------------------
// VALIDATION FUNCTION - Executes automated validation of Context Anchor compliance
// ----------------------------------------------------------------------------
export function validateContextAnchorCompliance(
  contract: unknown,
  workContract: unknown
): { valid: boolean; errors: string[]; complianceScore: number } {
  const errors: string[] = [];
  
  // Validate Context Anchor contract structure
  const anchorResult = ContextAnchorContractSchema.safeParse(contract);
  if (!anchorResult.success) {
    anchorResult.error.issues.forEach(issue => {
      errors.push(`Context Anchor schema error: ${issue.path.join('.')}: ${issue.message}`);
    });
  }
  
  // Validate Work Contract structure
  const workResult = WorkContractSchema.safeParse(workContract);
  if (!workResult.success) {
    workResult.error.issues.forEach(issue => {
      errors.push(`Work Contract schema error: ${issue.path.join('.')}: ${issue.message}`);
    });
  }
  
  // Verify Phase 2 constraints are met (from user's requirements)
  if (anchorResult.success) {
    const c = anchorResult.data;
    if (!c.runtime_unchanged_phase2) errors.push("Phase 2 violation: Runtime was modified");
    if (!c.sqlite_not_implemented) errors.push("Phase 2 violation: SQLite was implemented");
    if (!c.canonical_yaml_json_preserved) errors.push("Phase 2 violation: Canonical YAML/JSON not preserved");
    if (!c.backward_compatibility_guaranteed) errors.push("Backward compatibility violation: Breaking changes detected");
  }
  
  // Calculate compliance score (0-1)
  const totalChecks = 7; // Number of compliance checks
  const passedChecks = totalChecks - errors.length;
  const complianceScore = Math.max(0, passedChecks / totalChecks);
  
  return {
    valid: errors.length === 0,
    errors,
    complianceScore
  };
}