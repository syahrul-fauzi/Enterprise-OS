// IntentUnderstandingContract - EOS-INTELLIGENCE-001: Canonical dynamic semantic understanding contract
// This is the shared, single-source-of-truth contract for all intent understanding operations
// Preserved original location in atomic-composition (the capability that implements the pipeline)
// Replicated in presentation-features for UI type safety - MUST be kept in sync with this source file

// Import base types from identity capability to avoid duplication
import { IntentCategory, type IntentRawInput } from "@repo/capabilities-identity";

// Base actor type definitions
export type IntentActorType = "human" | "agent" | "system";

export type IntentSource = {
  actorType: IntentActorType;
  entryPoint: string; // e.g., "eos-face", "lawyershub", "ilc", "servicesid"
  timestamp: string; // ISO 8601 timestamp when intent was captured
};

// Base context for intent understanding
export type IntentContext = {
  domain?: string; // e.g., "legal", "immigration", "corporate"
  organization?: string; // Tenant/company ID if applicable
  locale?: string; // e.g., "id-ID", "en-US" for localization
  // Extended context for dynamic understanding - preserves raw human meaning
  known?: string[]; // List of known entities/contexts extracted from expression
  unknown?: string[]; // List of unknowns that need clarification
  constraints?: string[]; // List of constraints/requirements identified
};

// Domain candidate for AI semantic classification
export type DomainCandidate = {
  domain: string; // e.g., "legal-case", "service-request"
  confidence: number; // 0.0 to 1.0 confidence score
};

// Extracted entity from raw expression
export type ExtractedEntity = {
  type: string; // e.g., "company", "person", "location"
  role: string; // e.g., "target", "actor", "constraint"
  value: string; // The actual entity value extracted
};

// IntentUnderstanding - EOS-INTELLIGENCE-001: Dynamic semantic understanding output
// This is the canonical output from the AI Interpreter Provider
export type FailureClassification =
  | "F1_UNDERSTANDING_FAILURE"   // Failed to interpret the expression
  | "F2_KNOWLEDGE_FAILURE"       // Could not retrieve required knowledge
  | "F3_RESOLUTION_FAILURE"      // Failed to produce a valid resolution
  | "F4_CAPABILITY_ROUTING_FAILURE" // Could not map to any capability
  | "F5_WORK_FORMATION_FAILURE"; // Could not create work even if requested

export type EnrichmentStrategy =
  | "HUMAN_QUESTION"             // Ask the user for clarification
  | "KNOWLEDGE_RETRIEVAL"        // Query knowledge providers
  | "AGENT_ANALYSIS"             // Run agent analysis to fill gaps
  | "PROVIDER_CONSULTATION"      // Escalate to human/specialist provider
  | "MACHINE_OBSERVATION"        // Collect additional machine signals
  | "ESCALATE"                   // Full escalation to human operator

export type UnderstandingEvidence = {
  knownFacts: string[];          // All confirmed facts extracted
  unknowns: string[];           // What we still don't know
  hypotheses: string[];         // Working hypotheses
  evidenceCollected: string[];  // List of evidence IDs collected
  confidence: number;           // Overall confidence in understanding (0.0-1.0)
  lastUpdated: string;          // ISO timestamp of last evidence update
};

// AE-FIC v1: Stable root categories for failure taxonomy (constitutional roots)
export type FailureRootCategory = 
  | "UNDERSTANDING"
  | "KNOWLEDGE"
  | "RESOLUTION"
  | "CAPABILITY"
  | "ACTOR"
  | "EXECUTION"
  | "STATE"
  | "EVIDENCE"
  | "EXPERIENCE"
  | "SYSTEM";

// EOS FAILURE INTELLIGENCE MODEL v2: DYNAMIC DIMENSIONS (LOCKED DIMENSIONS, OPEN TYPES)
// Yang kita lock adalah failure dimensions, bukan semua failure types - dapat berkembang dinamis
export type FailureDimensions = {
  // DIMENSI 1: WHERE - di mana di pipeline failure terjadi? (bisa extensible untuk capability baru)
  where: { 
    pipelineStage: string; 
    capabilityId?: string; 
    providerId?: string; 
    component: string;
    location?: string; // Lokasi tambahan jika diperlukan capability baru
  };
  
  // DIMENSI 2: WHAT FAILED - detail spesifik failure
  whatFailed: { 
    expectedOutcome: string; 
    actualOutcome: string; 
    errorType?: string; 
    rawMessage?: string;
    stackTrace?: string;
  };
  
  // DIMENSI 3: SEVERITY - dipisahkan impact dan recoverability sesuai spesifikasi
  severity: {
    impact: "NONE" | "LOCAL" | "WORK" | "MULTI_WORK" | "SYSTEMIC";
    recoverability: "SELF_RECOVERABLE" | "RECOVERABLE_WITH_INTERACTION" | "REQUIRES_PROVIDER" | "REQUIRES_HUMAN" | "REQUIRES_ENGINEERING";
  };
  
  // DIMENSI 4: EXPECTATION GAP - seberapa besar gap antara expected dan actual
  expectationGap: { 
    gapType: string; 
    gapMagnitude: number; // 0.0 - 1.0, seberapa besar gap
    canRecover: boolean; // apakah bisa recovery secara otomatis?
  };
  
  // DIMENSI 5: UNKNOWN vs FAILURE - penting: tidak semua null adalah failure!
  isUnknown: boolean; // true = EOS belum punya cukup informasi, bukan failure sistem
  isFailure: boolean; // true = EOS seharusnya bisa melakukan sesuatu tapi gagal
  
  // DIMENSI 6: UNDERSTANDING STATE - first-class state pemahaman yang lengkap
  understandingState: { 
    confidence: number; // 0.0 - 1.0 confidence pemahaman
    knownEntities: string[]; // entitas yang dikenali
    unknownEntities: string[]; // entitas yang TIDAK dikenali
    resolutionPath: string | null; // path recovery yang diambil
    state: "KNOWN" | "UNKNOWN" | "UNCERTAIN" | "CONFLICTING" | "INVALID"; // state pemahaman first-class
  };
  
  // RECOVERY ATTEMPTS - semua upaya recovery yang dicoba, tidak hanya code fix!
  recoveryAttempts: Array<{
    strategy: string; // "ASK_CLARIFICATION", "TRY_ALTERNATIVE_PROVIDER", "GENERIC_FALLBACK", dll.
    timestamp: string;
    succeeded: boolean;
    notes?: string;
  }>;
  
  // LEARNING - knowledge yang didapat dari failure ini
  learning?: {
    hypothesis: string;
    evidence: string[];
    proposedFix?: string;
  };
};

// AE-FIC v1: FailureObservation - first-class domain object for all failures
// Diperbarui dengan FailureDimensions untuk mendukung model Failure Intelligence yang dinamis
export type FailureObservation = {
  id: string;
  occurredAt: string;
  source: { expressionId?: string; interactionId?: string; workId?: string };
  input: { raw: unknown; normalized?: unknown };
  expected: Record<string, unknown>;
  observed: Record<string, unknown>;
  classification: string; // Hierarchical: ROOT.SUBCATEGORY e.g., "KNOWLEDGE.NOT_FOUND"
  rootCategory: FailureRootCategory;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OBSERVED" | "CLASSIFIED" | "CLUSTERED" | "CANDIDATE_GENERATED" | "VALIDATING" | "PROMOTED" | "REJECTED";
  hypothesis?: string[];
  evidence?: string[];
  clusterId?: string; // Link to semantic cluster this observation belongs to
  failureFingerprint?: FailureFingerprint; // Fingerprint untuk clustering
  dimensions: FailureDimensions; // DIMENSION-BASED FAILURE INTELLIGENCE - kunci model dinamis
};

// AE-FIC v1: FailureFingerprint for semantic clustering of similar failures
export type FailureFingerprint = {
  rootCategory: FailureRootCategory;
  semanticOperation?: string;
  entities?: string[];
  resolutionType?: string;
  failureMode: string;
};

// AE-FIC v1: Expression pattern untuk coverage calculation
export type ExpressionPattern = {
  pattern: string;
  weight: number;
  semanticHash: string;
};

// Generalization types untuk GeneralizationCandidate v1 (Generalization Reality Loop 2)
export type AbstractionLevel = "INSTANCE" | "PATTERN" | "SEMANTIC_OPERATION" | "UNIVERSAL";
export type GeneralizationStatus = "HYPOTHESIS" | "EVALUATING" | "VALIDATED" | "PROMOTED" | "REJECTED";

export type GeneralizationCandidate = {
  id: string;
  sourceObservations: string[];
  abstraction: {
    primitive: string;
    level: AbstractionLevel;
  };
  invariant: {
    description: string;
    preservedFeatures: string[];
    variableFeatures: string[];
  };
  applicability: {
    domains: "ANY" | string[];
    origins: "ANY" | string[];
  };
  evidence: {
    observedCount: number;
    holdoutPassCount: number;
    counterexampleCount: number;
  };
  status: GeneralizationStatus;
  createdAt: string;
  updatedAt: string;
  // Backward compatibility untuk field yang masih dibutuhkan oleh pipeline lama
  trigger: { failureId: string; triggerClusterId?: string };
  target: "knowledge" | "understanding" | "resolution" | "capability" | "interaction" | "provider";
  proposedChange: unknown;
  rationale: string;
  confidence: number;
  expectedCoverage: ExpressionPattern[];
  regressionRisk: number;
  validationRequired: boolean;
  promotionStatus: "CANDIDATE" | "VALIDATING" | "PROMOTED" | "REJECTED";
};

// Backward compatibility: EnrichmentCandidate remains as alias for GeneralizationCandidate
export type EnrichmentCandidate = GeneralizationCandidate;

// AE-FIC v1: FailureCluster - semantic grouping dari failure serupa (AE-003)
export type FailureCluster = {
  id: string;
  rootCategory: FailureRootCategory;
  fingerprintPattern: FailureFingerprint;
  failureIds: string[];
  firstObservedAt: string;
  lastObservedAt: string;
  occurrenceCount: number;
  systemicGapHypothesis?: string;
  enrichmentCandidateId?: string;
};

// AE-FIC v1: ValidationRun - replay validation terhadap reality corpus (AE-005)
export type ValidationRun = {
  id: string;
  candidateId: string;
  triggeredAt: string;
  startedAt: string;
  completedAt?: string;
  corpusSize: number;
  passedTests: number;
  failedTests: number;
  regressionDetected: boolean;
  coverageImprovement: number;
  verdict: "PENDING" | "PASSED" | "FAILED" | "BLOCKED";
  overallStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "STOPPED";
  evidenceRef?: string;
};

// AE-FIC v1: EnrichmentPromotion - final promotion gate decision (AE-006)
export type EnrichmentPromotion = {
  id: string;
  candidateId: string;
  validationRunId: string;
  promotedAt?: string;
  promotedBy?: string;
  promotionReason?: string;
  status: "PENDING_VALIDATION" | "APPROVED" | "REJECTED" | "ARCHIVED";
  runtimeEnriched: boolean;
  // PR-001-P4: Promotion blast radius controls (shadow mode, limited cohort, rollout)
  blastRadius: {
    mode: "SHADOW" | "LIMITED_COHORT" | "FULL_PRODUCTION";
    cohortPercentage: number;
    allowedTenants: string[];
    rolloutStartedAt: string;
    lastUpdatedAt: string;
    observations: number;
    successfulApplications: number;
    failures: number;
  };
  rollbackReference: string;
};

// AE-FIC v1: Extended FailureIntelligenceData with observation and clustering support
export type FailureIntelligenceData = {
  failureType?: FailureClassification;
  failureReason?: string;
  attemptedStrategies: EnrichmentStrategy[];
  recoverySucceeded: boolean;
  canRetry: boolean;
  // AE-FIC v1 extensions
  failureObservation?: FailureObservation;
  failureFingerprint?: FailureFingerprint;
  clusterId?: string; // Link to semantic cluster of similar failures
};

export type IntentUnderstanding = {
  rawExpression: string; // Preserved original human input - NEVER destroyed
  interpretedObjective: string; // AI's interpreted/cleaned objective
  context: IntentContext;
  domainCandidates: DomainCandidate[];
  intentType: string; // Canonical intent type
  entities: ExtractedEntity[];
  unknowns: string[]; // List of items requiring clarification
  clarificationRequired: boolean; // Whether human clarification is needed
  informationResponse?: string; // Response for information-only requests (knowledge base answer)
  canFormWork: boolean; // Whether this understanding is sufficient to form a Work (false for pure info requests)
  canProceedToWork: boolean; // Whether user can choose to proceed to work after info response
  understandingEvidence: UnderstandingEvidence; // Evidence tracking for adaptive intelligence
  failureIntelligence?: FailureIntelligenceData; // Failure tracking for improvement loop
};

// Legacy backward compatibility types for existing resolution pipeline
export type IntentResolution = {
  objective: string; // Clear, actionable objective extracted from expression
  expectedOutcome: string; // What success looks like for this intent
  context: string; // Domain/context classification
  workType: string; // Canonical work type identifier (e.g., "pt-establishment")
  confidence: number; // 0.0 to 1.0 - confidence in resolution accuracy
  suggestedCapabilities?: string[]; // Capabilities that may be required for this work
  // Preserve the full dynamic understanding metadata for audit/traceability
  dynamicUnderstanding?: IntentUnderstanding;
};

// Full intent contract persisted to storage
export type IntentContract = {
  id: string; // Unique identifier for the intent contract - required for FormationConfirmation provenance
  expression: string; // Raw user input/need (preserved at top level for backward compatibility)
  source: IntentSource;
  context?: IntentContext;
  resolution: IntentResolution; // Resolved semantic understanding of the intent
  // Full dynamic understanding metadata - added in EOS-INTELLIGENCE-001
  dynamicUnderstanding?: IntentUnderstanding;
};

// --- B1: Intent Interaction Runtime Types (Intelligent Intent Runtime v1) ---
// Core runtime state that tracks the entire interaction lifecycle
// From "belum memahami" (not understood) to "cukup memahami untuk bertindak" (sufficient to act)
export type InteractionStatus = 
  | "UNDERSTANDING"   // Still processing, insufficient confidence
  | "SUFFICIENT"      // Sufficient understanding to act
  | "RESOLVED"        // Fully resolved, action taken
  | "BLOCKED"         // Cannot understand, needs escalation
  | "ESCALATED";      // Sent to human/specialist for resolution

export type ResolutionType =
  | "INFORMATION"     // Pure information request, no work needed
  | "CONSULTATION"    // Needs human/specialist consultation
  | "CAPABILITY"      // Can be handled by an existing EOS capability
  | "WORK"            // Sufficient to create a formal Work item
  | "ESCALATE";       // Requires external human intervention

// UnderstandingHypothesis - probabilistic model of what the expression might mean
export type UnderstandingHypothesis = {
  id: string;
  interpretedObjective: string;
  domainCandidates: DomainCandidate[];
  confidence: number;
  canFormWork: boolean;
  createdAt: string;
  updatedAt: string;
  retracted?: boolean; // SCENARIO 4-5: Whether this hypothesis has been retracted
  retractedAt?: string;
  retractionReason?: string;
};

// UnderstandingGap - missing information that prevents full understanding
export type UnderstandingGap = {
  id: string;
  field: string;
  description: string;
  priority: number; // 1 (highest) to 5 (lowest)
  impact: string; // What understanding is blocked by this gap
};

// AdaptiveQuestion - generated question to fill an understanding gap
export type AdaptiveQuestion = {
  id: string;
  gapId: string;
  questionText: string;
  suggestedAnswers?: string[]; // Optional predefined answers
  askedAt?: string;
  answeredAt?: string;
  answer?: string;
};

// InteractionEvent - tracks all changes to the interaction state for audit
export type InteractionEvent = {
  id: string;
  eventType: "CREATED" | "UPDATED" | "QUESTION_ASKED" | "ANSWER_RECEIVED" | "RESOLVED" | "ESCALATED";
  timestamp: string;
  actor: {
    type: "human" | "agent" | "machine" | "system";
    actorId?: string;
  };
  description: string;
  previousState?: Partial<IntentInteractionState>;
  newState?: Partial<IntentInteractionState>;
};

// InteractionResolution - final resolution of the interaction
export type InteractionResolution = {
  type: ResolutionType;
  resolvedAt: string;
  resolvedBy: {
    type: "human" | "agent" | "machine" | "system";
    actorId?: string;
  };
  recommendedCapability?: string; // If type=CAPABILITY
  workId?: string; // If type=WORK, the created work ID
  informationResponse?: string; // If type=INFORMATION, the answer provided
};

// IntentInteractionState - THE canonical runtime object for the entire interaction lifecycle
export type IntentInteractionState = {
  id: string;
  
  // Source: Where did this expression come from?
  source: {
    type: "human" | "agent" | "machine" | "system";
    actorId?: string;
    entryPoint: string; // Which EOS surface created this interaction
    timestamp: string; // ISO 8601 when interaction started
  };
  
  // Expression: The raw input that started it all
  expression: {
    raw: string; // Preserved original expression - NEVER modified
    normalized?: string; // Cleaned/normalized version for processing
    createdAt: string;
    lastUpdatedAt: string;
  };
  
  // Understanding: Current state of EOS's comprehension
  understanding: {
    hypotheses: UnderstandingHypothesis[]; // All possible interpretations
    topHypothesisId: string | null; // The highest-confidence hypothesis
    confidence: number; // Overall confidence in current understanding (0.0-1.0)
    status: InteractionStatus;
    knownEntities: ExtractedEntity[]; // Entities extracted so far
    context: IntentContext; // Current context state
    statusUpdatedAt: string; // When status last changed
  };
  
  // Delta: What's changed or missing in our understanding
  delta: {
    missing: UnderstandingGap[]; // Gaps preventing full understanding
    questions: AdaptiveQuestion[]; // Questions we've asked to fill gaps
    lastDeltaUpdate: string; // When gaps/questions were last updated
  };
  
  // Resolution: The final outcome if resolved
  resolution?: InteractionResolution;
  
  // History: Audit trail of all interactions
  history: InteractionEvent[];
};

// Factory function to create a new IntentInteractionState
// Creates the canonical initial state for any new expression
export function createNewInteraction(
  rawExpression: string,
  sourceType: IntentInteractionState["source"]["type"],
  entryPoint: string,
  actorId?: string
): IntentInteractionState {
  const now = new Date().toISOString();
  
  return {
    id: crypto.randomUUID(),
    source: {
      type: sourceType,
      actorId,
      entryPoint,
      timestamp: now,
    },
    expression: {
      raw: rawExpression,
      createdAt: now,
      lastUpdatedAt: now,
    },
    understanding: {
      hypotheses: [],
      topHypothesisId: null,
      confidence: 0,
      status: "UNDERSTANDING",
      knownEntities: [],
      context: {
        locale: "id-ID",
        known: [],
        unknown: [],
        constraints: [],
      },
      statusUpdatedAt: now,
    },
    delta: {
      missing: [],
      questions: [],
      lastDeltaUpdate: now,
    },
    history: [{
      id: crypto.randomUUID(),
      eventType: "CREATED",
      timestamp: now,
      actor: {
        type: sourceType,
        actorId,
      },
      description: `New interaction created from ${sourceType} at ${entryPoint}: "${rawExpression.substring(0, 50)}${rawExpression.length > 50 ? "..." : ""}"`,
    }],
  };
}

// Process input parameters for the engine
export type InteractionProcessInput = {
  expression: string;
  source: IntentInteractionState["source"]["type"];
  entryPoint: string;
  actorId?: string;
  existingState?: IntentInteractionState; // For continuing an existing interaction
  isCorrectingUnderstanding?: boolean; // SCENARIO 5: User is actively correcting previous wrong understanding
  context?: Record<string, any>; // Additional context from the caller
};

// Process output - what the engine returns to the caller
export type InteractionProcessOutput = {
  state: IntentInteractionState;
  understanding: IntentInteractionState["understanding"];
  delta: IntentInteractionState["delta"];
  nextInteraction: "CONTINUE" | "CLARIFY" | "RESOLVE" | "ESCALATE";
  resolution?: IntentInteractionState["resolution"];
};

// Re-export shared identity types to maintain single source of truth (compliant with isolatedModules)
export type { IntentCategory, IntentRawInput };