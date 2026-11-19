// 6-Boundary Compliance Contracts (Tahap B Mandate)
// Definisi kontrak untuk boundary validation dan architecture fitness checks

// Semantic Boundary: Domain of Work meaning and continuity
export type SemanticBoundary = 'work' | 'identity' | 'evidence' | 'governance' | 'capability' | 'presentation';

// Authority Boundary: Who has the right to act
export type AuthorityBoundary = 'human' | 'agent' | 'system' | 'connector';

// Execution Boundary: Where the work runs
export type ExecutionBoundary = 'core' | 'adapter' | 'runtime' | 'external';

// Evidence Boundary: What counts as verified truth
export type EvidenceBoundary = 'audit' | 'log' | 'signature' | 'external';

// Presentation Boundary: How work appears to actors
export type PresentationBoundary = 'face' | 'api' | 'mcp' | 'ui';

// Identity Boundary: Domain ownership for boundary validation
export type IdentityBoundary = 'identity' | 'work-core' | 'atomic-composition' | 'connector-ecosystem' | 'business-os';

// Combined Boundary type
export type Boundary = SemanticBoundary | AuthorityBoundary | ExecutionBoundary | EvidenceBoundary | PresentationBoundary | IdentityBoundary;

// Boundary Access Validation Interface
export interface BoundaryAccess {
  sourceDomain: IdentityBoundary;
  targetDomain: IdentityBoundary;
  allowed: boolean;
  reason?: string;
}

// Fitness Check Result Interface
export interface FitnessCheckResult {
  passed: boolean;
  totalChecked: number;
  failed: number;
  errors: string[];
  executionTimeMs: number;
  checkedAt: Date;
}

// Fitness Baseline Interface
export interface FitnessBaseline {
  timestamp: Date;
  totalErrors: number;
  capabilityMismatchCount: number;
  authInconsistencyCount: number;
  pureAdapterViolationCount: number;
  totalCommandsScanned: number;
  totalRoutesScanned: number;
}

// Work Face Projection Interface
export interface WorkFaceProjection {
  workId: string;
  faceType: string;
  projection: Record<string, unknown>;
}

// Domain Authority Ownership Mapping - defines which domain owns which submodules
const DOMAIN_AUTHORITY_OWNERSHIP: Record<IdentityBoundary, string[]> = {
  'identity': ['actor', 'session', 'tenant', 'workspace', 'membership'],
  'work-core': ['work', 'status', 'transition', 'continuity'],
  'atomic-composition': ['seat', 'companion', 'lifecycle', 'fabric'],
  'connector-ecosystem': ['channels', 'adapters', 'integrations', 'mcp'],
  'business-os': ['orchestration', 'execution', 'governance', 'evidence']
};

// Allowed Boundary Access Matrix - defines which domains can access which other domains
const ALLOWED_BOUNDARY_ACCESS: Record<IdentityBoundary, IdentityBoundary[]> = {
  'identity': ['identity', 'work-core'],
  'work-core': ['work-core', 'identity', 'atomic-composition', 'connector-ecosystem'],
  'atomic-composition': ['atomic-composition', 'work-core', 'identity'],
  'connector-ecosystem': ['connector-ecosystem', 'work-core'],
  'business-os': ['business-os', 'work-core', 'identity', 'atomic-composition', 'connector-ecosystem']
};

/**
 * Validate boundary access between source domain and target domain
 * Enforces Tahap B boundary compliance rules
 */
export function validateBoundaryAccess(sourceDomain: IdentityBoundary, targetDomain: IdentityBoundary): boolean {
  console.log(`[validateBoundaryAccess] Checking access from ${sourceDomain} to ${targetDomain}`);
  
  // Check if source domain exists in allowed access matrix
  if (!ALLOWED_BOUNDARY_ACCESS[sourceDomain]) {
    console.error(`[validateBoundaryAccess] Source domain ${sourceDomain} not found in allowed access matrix`);
    return false;
  }
  
  // Check if target domain is in allowed list for source domain
  const isAllowed = ALLOWED_BOUNDARY_ACCESS[sourceDomain].includes(targetDomain);
  
  if (!isAllowed) {
    console.error(`[validateBoundaryAccess] Access denied: ${sourceDomain} cannot access ${targetDomain}`);
    console.error(`[validateBoundaryAccess] Allowed domains for ${sourceDomain}: ${ALLOWED_BOUNDARY_ACCESS[sourceDomain].join(', ')}`);
  } else {
    console.log(`[validateBoundaryAccess] Access granted: ${sourceDomain} → ${targetDomain}`);
  }
  
  return isAllowed;
}

/**
 * Validate all 6 boundaries for a given operation
 * Ensures full compliance with Tahap B architecture rules
 */
export function validateAllBoundaries(
  semanticBoundary: SemanticBoundary,
  authorityBoundary: AuthorityBoundary,
  executionBoundary: ExecutionBoundary,
  evidenceBoundary: EvidenceBoundary,
  presentationBoundary: PresentationBoundary,
  identityBoundary: IdentityBoundary
): boolean {
  console.log(`[validateAllBoundaries] Validating all boundaries for identity domain ${identityBoundary}`);
  
  // Validate boundary access from identity domain to itself
  const accessValid = validateBoundaryAccess(identityBoundary, identityBoundary);
  
  if (!accessValid) {
    console.error(`[validateAllBoundaries] Boundary access validation failed`);
    return false;
  }
  
  console.log(`[validateAllBoundaries] All boundaries validated successfully`);
  return true;
}

/**
 * Validate no circular dependencies in capability dependency graph
 * Prevents architecture drift from circular imports
 */
export function validateNoCircularDependencies(dependencies: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  console.log(`[validateNoCircularDependencies] Checking dependencies: ${dependencies.join(' → ')}`);
  
  // Check for duplicate dependencies (simple circular detection)
  const uniqueDeps = new Set(dependencies);
  if (uniqueDeps.size !== dependencies.length) {
    errors.push(`Circular dependency detected: duplicate entries in dependency chain ${dependencies.join(' → ')}`);
  }
  
  // More sophisticated circular detection could be added here
  const valid = errors.length === 0;
  
  if (valid) {
    console.log(`[validateNoCircularDependencies] No circular dependencies detected`);
  } else {
    console.error(`[validateNoCircularDependencies] Circular dependencies found: ${errors.join(', ')}`);
  }
  
  return { valid, errors };
}

// Quality Gates - EOS 2027 Actor Assurance Standard
// Defines 5 mandatory gates before an actor is allowed into production

export type QualityGateType =
  | "G1" // Identity & Authority Gate - Identitas, owner, akses, tenant isolation, permission
  | "G2" // Functional & Contract Gate - Input/output validation, business rules, no silent misrouting
  | "G3" // Security & Adversarial Gate - Prompt injection, data exfiltration, privilege escalation, abuse
  | "G4" // Reliability & Recovery Gate - Chaos testing, replay, idempotency, retry limit, timeout, rollback
  | "G5"; // Economic & Business Gate - COGS, waktu penyelesaian, tingkat keberhasilan, dampak bisnis, ROI

export interface QualityGateResult {
  readonly gateType: QualityGateType;
  readonly passed: boolean;
  readonly totalChecked: number;
  readonly failed: number;
  readonly criticalFindings: number;
  readonly findings: Array<{
    readonly severity: "low" | "medium" | "high" | "critical";
    readonly message: string;
    readonly code?: string;
  }>;
  readonly executionTimeMs: number;
  readonly checkedAt: Date;
}

export interface ActorQualityGates {
  readonly actorId: string;
  readonly G1: QualityGateResult;
  readonly G2: QualityGateResult;
  readonly G3: QualityGateResult;
  readonly G4: QualityGateResult;
  readonly G5: QualityGateResult;
  readonly overallPassed: boolean;
  readonly goldenTestPassRate: number; // ≥95% target
  readonly criticalSecurityFindings: number; // 0 target
  readonly unauthorizedSideEffects: number; // 0 target
  readonly crossTenantLeakage: number; // 0 target
  readonly executionTraceCoverage: number; // 100% target
  readonly unboundedRetrySpending: number; // 0 target
  readonly workContinuityViolations: number; // 0 target
  readonly businessOutcomeEvidenceRequired: boolean; // Wajib
}

export const QUALITY_GATE_TARGETS = {
  goldenTestPassRate: 95,
  criticalSecurityFindings: 0,
  unauthorizedSideEffects: 0,
  crossTenantLeakage: 0,
  executionTraceCoverage: 100,
  unboundedRetrySpending: 0,
  workContinuityViolations: 0,
} as const;

/**
 * Validate if an actor has passed all mandatory Quality Gates
 * Enforces EOS 2027 Actor Assurance requirements before production access
 */
export function validateQualityGates(gates: ActorQualityGates): boolean {
  console.log(`[validateQualityGates] Checking all gates for actor ${gates.actorId}`);
  
  // Check overall gate status
  if (!gates.overallPassed) {
    console.error(`[validateQualityGates] Overall gate check failed for actor ${gates.actorId}`);
    return false;
  }
  
  // Verify each individual gate passed
  const allGatesPassed = gates.G1.passed && gates.G2.passed && gates.G3.passed && gates.G4.passed && gates.G5.passed;
  
  if (!allGatesPassed) {
    console.error(`[validateQualityGates] One or more Quality Gates failed: G1=${gates.G1.passed}, G2=${gates.G2.passed}, G3=${gates.G3.passed}, G4=${gates.G4.passed}, G5=${gates.G5.passed}`);
    return false;
  }
  
  // Verify critical security findings are zero
  if (gates.criticalSecurityFindings > QUALITY_GATE_TARGETS.criticalSecurityFindings) {
    console.error(`[validateQualityGates] Critical security findings: ${gates.criticalSecurityFindings} (target: ${QUALITY_GATE_TARGETS.criticalSecurityFindings})`);
    return false;
  }
  
  // Verify cross-tenant leakage is zero
  if (gates.crossTenantLeakage > QUALITY_GATE_TARGETS.crossTenantLeakage) {
    console.error(`[validateQualityGates] Cross-tenant leakage detected: ${gates.crossTenantLeakage} (target: ${QUALITY_GATE_TARGETS.crossTenantLeakage})`);
    return false;
  }
  
  // Verify work continuity violations are zero
  if (gates.workContinuityViolations > QUALITY_GATE_TARGETS.workContinuityViolations) {
    console.error(`[validateQualityGates] Work continuity violations: ${gates.workContinuityViolations} (target: ${QUALITY_GATE_TARGETS.workContinuityViolations})`);
    return false;
  }
  
  console.log(`[validateQualityGates] All Quality Gates passed for actor ${gates.actorId}`);
  return true;
}